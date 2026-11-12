/**
 * ARCHITECTURE OVERVIEW:
 * High-performance, O(1) hash-based route dispatcher for Express. 
 * Replaces sequential O(N) middleware matching by extracting the module prefix (e.g., `/api/v1/user`) and routing requests directly to the exact controller via a hashed dictionary lookup.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Discovery: Recursively walk directories to locate `*.route.js` (or `.ts`) files.
 * 2. Registration: Import route modules, inspect their Express Router stack, and extract the base path segment.
 * 3. Hashing: Map the base path (e.g., 'user_master') to its specific Router middleware in a constant-time lookup object.
 * 4. Dispatching: Intercept incoming requests, extract the prefix, and execute only the mapped Router (falling back to sequential routing for anomalies).
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Initialization: 
 *    `const loader = new FastRouteLoader();`
 *    `const routes = loader.walkSync(['./src/routes']);`
 *    `await loader.loadRoutes(app, routes);`
 */

import { readdirSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import { Express, Request, Response, NextFunction, RequestHandler, Router } from "express";
import logger from "../../config/logs/winston.config.js"; 

const DEBUG_MODE: boolean = process.env.DEBUG_MODE === "true";

// --- Type Definitions ---

export interface RouteFileInfo {
    path: string;
    url: string;
    name: string;
}

export interface RouteMapEntry {
    router: RequestHandler;
    name: string;
    paths: string[];
}

export interface FallbackRouteEntry {
    router: RequestHandler;
    name: string;
}

// Workaround to safely read undocumented Express internals without TS throwing errors
interface ExpressRouterInternal {
    stack?: Array<{ route?: { path?: string } }>;
}

// ============================================================================
// FAST ROUTE DISPATCHER - Hash-based routing
// ============================================================================
export class FastRouteDispatcher {
    private routeMap: Map<string, RouteMapEntry[]>;
    private fallbackRouters: FallbackRouteEntry[];
    private hitStats: Map<string, number>;
    private stats: {
        totalRoutes: number;
        mappedRoutes: number;
        fallbackRoutes: number;
    };

    constructor() {
        this.routeMap = new Map(); 
        this.fallbackRouters = []; 
        this.hitStats = new Map(); 
        this.stats = {
            totalRoutes: 0,
            mappedRoutes: 0,
            fallbackRoutes: 0,
        };
    }

    private extractRouteKey(path: string): string | null {
        const segments = path.replace(/^\//, '').split('/');
        
        // Fast path: /api/v1/{service}/...
        if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'v1') {
            return segments[2];
        }
        
        return null;
    }

    public register(routeModule: RequestHandler, routeInfo: RouteFileInfo): boolean {
        if (typeof routeModule !== 'function') {
            logger.warn(`Invalid route module: ${routeInfo.name}`);
            return false;
        }

        this.stats.totalRoutes++;

        // Safely inspect the Express Router internal stack
        const internalRouter = routeModule as ExpressRouterInternal;
        const paths: string[] = internalRouter.stack
            ?.filter((layer) => layer.route)
            .map((layer) => layer.route?.path)
            .filter((p): p is string => Boolean(p)) || [];

        if (paths.length === 0) {
            this.fallbackRouters.push({ router: routeModule, name: routeInfo.name });
            this.stats.fallbackRoutes++;
            return false;
        }

        const routeKey = this.extractRouteKey(paths[0]);

        if (!routeKey) {
            this.fallbackRouters.push({ router: routeModule, name: routeInfo.name });
            this.stats.fallbackRoutes++;
            if (DEBUG_MODE) {
                console.log(`  → Fallback: ${routeInfo.name} (path: ${paths[0]})`);
            }
            return false;
        }

        if (!this.routeMap.has(routeKey)) {
            this.routeMap.set(routeKey, []);
        }

        this.routeMap.get(routeKey)!.push({
            router: routeModule,
            name: routeInfo.name,
            paths: paths,
        });

        this.stats.mappedRoutes++;
        if (!this.hitStats.has(routeKey)) {
            this.hitStats.set(routeKey, 0);
        }

        return true;
    }

    public buildDispatcher(): RequestHandler {
        // Convert Map to a flat object for maximum runtime lookup speed
        const routeMapObj: Record<string, RequestHandler[]> = {};
        for (const [key, routers] of this.routeMap) {
            routeMapObj[key] = routers.map(r => r.router);
        }

        return (req: Request, res: Response, next: NextFunction): void => {
            const path = req.path;
            const segments = path.replace(/^\//, '').split('/');
            
            // O(1) Hash Lookup
            if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'v1') {
                const routeKey = segments[2];
                const routers = routeMapObj[routeKey];
                
                if (routers) {
                    this.hitStats.set(routeKey, (this.hitStats.get(routeKey) || 0) + 1);
                    
                    let index = 0;
                    const runNext = (err?: any): void => {
                        if (err) return next(err);
                        if (index >= routers.length) return next();
                        
                        routers[index++](req, res, runNext);
                    };
                    
                    return runNext();
                }
            }
            
            // O(N) Fallback Lookup
            if (this.fallbackRouters.length > 0) {
                let index = 0;
                const runFallback = (err?: any): void => {
                    if (err) return next(err);
                    if (index >= this.fallbackRouters.length) return next();
                    
                    this.fallbackRouters[index++].router(req, res, runFallback);
                };
                
                return runFallback();
            }
            
            next();
        };
    }

    public printStats(): void {
        console.log(`\n📊 Fast Route Dispatcher Statistics:`);
        console.log(`   • Total routes: ${this.stats.totalRoutes}`);
        console.log(`   • Hash-mapped routes: ${this.stats.mappedRoutes}`);
        console.log(`   • Fallback routes: ${this.stats.fallbackRoutes}`);
        console.log(`   • Unique route keys: ${this.routeMap.size}`);
        console.log(`   • Lookup complexity: O(1) hash lookup`);
    }

    public getStats() {
        const topRoutes = Array.from(this.hitStats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key, hits]) => ({ route: key, hits }));

        return {
            ...this.stats,
            routeKeys: Array.from(this.routeMap.keys()),
            topRoutes,
        };
    }
}

// ============================================================================
// FAST ROUTE LOADER
// ============================================================================
export default class FastRouteLoader {
    private loadedCount: number = 0;
    private failedCount: number = 0;
    private routeCache: RouteFileInfo[] | null = null;
    private moduleCache: Map<string, RequestHandler>;
    private dispatcher: FastRouteDispatcher;

    constructor() {
        this.moduleCache = new Map();
        this.dispatcher = new FastRouteDispatcher();
    }

    public walkSync(dirs: string[], useCache: boolean = true): RouteFileInfo[] {
        if (useCache && this.routeCache) {
            if (DEBUG_MODE) console.log("📦 Using cached route paths");
            return this.routeCache;
        }

        const allFiles: RouteFileInfo[] = [];
        const stack: string[] = [...dirs];

        while (stack.length > 0) {
            const dir = stack.pop()!;
            const normalizedDir = resolve(dir);

            try {
                const entries = readdirSync(normalizedDir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = join(normalizedDir, entry.name);

                    if (entry.isDirectory()) {
                        stack.push(fullPath);
                    } else if (entry.name.endsWith(".route.js") || entry.name.endsWith(".route.ts")) {
                        allFiles.push({
                            path: fullPath,
                            url: pathToFileURL(fullPath).href,
                            name: entry.name,
                        });
                    }
                }
            } catch (err: any) {
                logger.error(`Error reading directory: ${normalizedDir}`, err);
            }
        }

        this.routeCache = allFiles;
        return allFiles;
    }

    public async loadRoutes(app: Express, routeFiles: RouteFileInfo[]) {
        console.log(`\n📦 Loading ${routeFiles.length} routes...`);
        const startTime = Date.now();

        const results = await Promise.allSettled(
            routeFiles.map((route) => this.loadSingleRoute(route))
        );

        results.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value) {
                this.loadedCount++;
                const routeInfo = routeFiles[index];
                this.dispatcher.register(result.value, routeInfo);
            } else {
                this.failedCount++;
                const route = routeFiles[index];
                const reason = (result as PromiseRejectedResult).reason;
                
                // FIXED: Print the full raw stack trace to the console so you can see the exact line number!
                console.error(`\n❌ CRITICAL ERROR LOADING ROUTE: ${route.name}`);
                console.error(reason);
                
                logger.error(`Failed to load route: ${route.url}`, reason);
            }
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Routes loaded: ${this.loadedCount}/${routeFiles.length} (${duration}ms)`);

        console.log(`\n🚀 Installing fast route dispatcher...`);
        app.use(this.dispatcher.buildDispatcher());
        
        // ==========================================
        // 🚨 ADD THIS: 404 CATCH-ALL JSON HANDLER
        // ==========================================
        app.use((req: Request, res: Response) => {
    logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    
        res.status(404).json({
                    response_code: 404,
                    message: "Endpoint Not Found. The requested URL does not exist on this server.",
                    error: true,
                    data: {
                        request_details: {
                            attempted_url: req.originalUrl,
                            http_method: req.method
                        },
                        troubleshooting_steps: [
                            `Verify the HTTP method. The endpoint might exist, but requires GET, POST, PUT, or DELETE instead of ${req.method}.`,
                            `Check for typographical errors, missing segments, or extra trailing slashes in the path.`,
                            `Ensure all required path parameters (e.g., '/user/:id') are provided and valid.`,
                            `Confirm that required query strings (e.g., '?status=active') are correctly formatted if applicable.`,
                            `Verify that the API version prefix (e.g., '/api/v1/') is accurate and currently supported.`
                        ],
                        support: {
                            message: "If you believe this is an error or need integration assistance, please reach out.",
                            email: process.env.SUPPORT_EMAIL || "sandesh.aher@mversesolution.com",
                            documentation: process.env.DOCS_URL || "https://docs.yourdomain.com/api"
                        }
                    }
                });
            });

        this.dispatcher.printStats();

        return { 
            loaded: this.loadedCount, 
            failed: this.failedCount, 
            duration 
        };
    }

    private async loadSingleRoute(routeInfo: RouteFileInfo): Promise<RequestHandler> {
        try {
            if (this.moduleCache.has(routeInfo.path)) {
                return this.moduleCache.get(routeInfo.path)!;
            }

            const module = await import(routeInfo.url);
            const routeModule: RequestHandler = module.default;

            if (typeof routeModule !== "function") {
                throw new Error(`Route does not export a default function middleware/router`);
            }

            this.moduleCache.set(routeInfo.path, routeModule);

            if (DEBUG_MODE) {
                console.log(`  ✓ ${routeInfo.name}`);
            }

            return routeModule;
        } catch (error: any) {
            // FIXED: Do not throw a new Error! That destroys the stack trace.
            // Just append the file name to the existing error to preserve exactly where it failed.
            if (error instanceof Error) {
                error.message = `[${routeInfo.name}] ${error.message}`;
                throw error; 
            }
            throw new Error(`[${routeInfo.name}] ${String(error)}`);
        }
    }

    public clearCache(): void {
        this.routeCache = null;
        this.moduleCache.clear();
        console.log("🗑️  Route cache cleared");
    }
}