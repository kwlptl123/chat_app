/**
 * ARCHITECTURE OVERVIEW:
 * Primary application entry point. Bootstraps the Express server, applies core security middleware, initializes the high-performance O(1) route dispatcher, and manages graceful shutdown sequences.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Environment & Utilities: Load environment variables and initialize performance tracking.
 * 2. Security & Middleware: Apply Helmet, CORS, body parsers, compression, and cryptographic interceptors.
 * 3. Route Indexing: Crawl the `src/services` directories and load the O(1) hash-based route dispatcher.
 * 4. Server Lifecycle: Start the HTTP server, initialize cron jobs/websockets, and register process exit handlers.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Start Server: `npm run build && node dist/server.js`
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cluster from "cluster";
import helmet from "helmet"; // Secure by default: Reactivated
import compression from "compression";
import cors from "cors";
import path, { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Server } from "http";
import db from "../src/modules/index.js"

// --- Modernized TS Utilities ---
import logger from "./config/logs/winston.config.js";
import createResponse from "./utils/helper/response.js";
import HTTP_STATUS_CODES from "./utils/constants/code/http.status.code.js";
import encrypt from "./utils/security/encrypt.js";
import decrypt from "./utils/security/decrypt.js";
import FastRouteLoader from "./utils/router/route.indexer.js";

import LocalJsonHelper from "./utils/helper/local.json.helper.js";


// --- Pending/Unconverted Utilities ---
// Note: These paths reflect your old JS structure. You will need to update these
// as you migrate them to TS and move them to their proper domain folders.
// import "./config/logs/developerEmailTransport.js"; 
// import startCluster from "./utils/helper/cluster.js";
// import initScheduler from "./utils/helper/request.schedular.email.js";
// import setupWebSocket from "./websocket.config.js";
// import ProfileMergeCron from './utils/helper/feed_algo_helper/profile.merge.cron.js';
// import { preloadNgoFieldCache } from "./utils/helper/feed_algo_helper/ngo_field.cache.js";

// 1. No Magic: Augment global namespaces to satisfy the TypeScript compiler
declare global {
    namespace Express {
        interface Request {
            _startTime?: number;
        }
    }
    // Allow manual Garbage Collection typing
    // var gc: (() => void) | undefined;
}

// ============================================================================
// PERFORMANCE TIMER UTILITY
// ============================================================================
class PerformanceTimer {
    private timers: Map<string, number> = new Map();
    private startTime: number = performance.now();

    public start(label: string): void {
        this.timers.set(label, performance.now());
    }

    public end(label: string): number {
        const start = this.timers.get(label);
        if (!start) {
            console.warn(`⚠️ Timer "${label}" was never started`);
            return 0;
        }
        const duration = performance.now() - start;
        this.timers.delete(label);
        return duration;
    }

    public log(label: string, icon: string = "⏱️"): number {
        const duration = this.end(label);
        const formatted = duration < 1000 ? `${duration.toFixed(2)}ms` : `${(duration / 1000).toFixed(2)}s`;
        console.log(`${icon} ${label}: ${formatted}`);
        return duration;
    }

    public getTotalTime(): number {
        return performance.now() - this.startTime;
    }

    public logTotal(): number {
        const total = this.getTotalTime();
        const formatted = total < 1000 ? `${total.toFixed(2)}ms` : `${(total / 1000).toFixed(2)}s`;
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🎯 TOTAL STARTUP TIME: ${formatted}`);
        console.log(`${"=".repeat(60)}\n`);
        return total;
    }
}

const timer = new PerformanceTimer();

// ============================================================================
// ENVIRONMENT & CONFIG
// ============================================================================
timer.start("env-config");

const DEBUG_MODE = process.env.DEBUG_MODE === "true";
const ENABLE_ENCRYPTION = process.env.ENABLE_ENCRYPTION === "true";
const ENABLE_REQUEST_LOGGING = process.env.ENABLE_REQUEST_LOGGING !== "false";
const PORT = parseInt(process.env.PORT || "3000", 10);

timer.log("env-config", "⚙️");

const routeLoader = new FastRouteLoader();

// ============================================================================
// OPTIMIZED ENCRYPTION/DECRYPTION MIDDLEWARE
// ============================================================================
const encryptionMiddleware = () => {
    if (!ENABLE_ENCRYPTION) return (req: Request, res: Response, next: NextFunction) => next();

    return (req: Request, res: Response, next: NextFunction) => {
        const skipPaths = ["/api/v1/decrypt", "/api/v1/encrypt", "/", "/health"];
        if (skipPaths.includes(req.path)) return next();

        if (req.method !== "GET" && req.method !== "DELETE") {
            const originalSend = res.send;
            
            // Override the res.send method to intercept the payload before transmission
            res.send = function (this: Response, data: any): Response {
                try {
                    const encryptedData = encrypt(data);
                    res.setHeader("Content-Type", "application/json");
                    return originalSend.call(this, JSON.stringify(encryptedData));
                } catch (err) {
                    logger.error("Encryption error:", err);
                    return originalSend.call(this, data); 
                }
            } as any;
        }
        next();
    };
};

const decryptionMiddleware = () => {
    if (!ENABLE_ENCRYPTION) return (req: Request, res: Response, next: NextFunction) => next();

    return (req: Request, res: Response, next: NextFunction) => {
        const skipPaths = ["/api/v1/decrypt", "/api/v1/encrypt"];
        if (skipPaths.includes(req.path) || req.method === "GET" || req.method === "DELETE") {
            return next();
        }

        if (req.is("multipart/form-data")) return next();

        try {
            if (req.body && req.body.reqBody) {
                const decryptedData = decrypt(req.body.reqBody);
                req.body = decryptedData;
            } else if (req.body && !req.body.reqBody) {
                return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(
                    createResponse(HTTP_STATUS_CODES.BAD_REQUEST, "Body required!", null, true)
                );
            }
        } catch (err) {
            logger.error("Decryption error:", err);
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(
                createResponse(HTTP_STATUS_CODES.BAD_REQUEST, "Invalid encrypted data", null, true)
            );
        }
        next();
    };
};

// ============================================================================
// EXPRESS APP INITIALIZATION
// ============================================================================
timer.start("express-setup");
const app = express();

// 2. Performance Tracking Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers.upgrade?.toLowerCase() === "websocket") return; 
    
    req._startTime = Date.now();
    res.on('finish', () => {
        const total = Date.now() - (req._startTime || Date.now());
        if (total > 50) console.log(`🐢 SLOW: ${req.method} ${req.originalUrl} → ${total}ms`);
    });
    next();
});

// 3. Secure by Default: Helmet enabled
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, 
}));

// 4. Secure by Default: Strict CORS instead of wildcard
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*", // Define strict origin in .env for production
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
}));

if (ENABLE_REQUEST_LOGGING) app.use(morgan("dev"));

// 5. Body Parsers with memory limits
app.use(express.json({ limit: process.env.JSON_LIMIT || "10mb", strict: true }));
app.use(express.urlencoded({ limit: process.env.URLENCODED_LIMIT || "10mb", extended: true, parameterLimit: 1000 }));

// 6. Static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use("/resources", express.static(path.resolve(__dirname, "resources"), {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
    etag: true,
    lastModified: true,
}));

// 7. Compression & Cryptography
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req: Request, res: Response) => { // 👈 Explicitly added Request & Response types
        if (req.headers["x-no-compression"] || req.path.includes("/health")) return false;
        return compression.filter(req, res);
    },
}));

if (ENABLE_ENCRYPTION) {
    app.use(decryptionMiddleware());
    app.use(encryptionMiddleware());
    console.log("🔐 Encryption/Decryption enabled");
}

timer.log("express-setup", "⚡");

// ============================================================================
// SYSTEM ROUTES
// ============================================================================

app.get("/favicon.ico", (req: Request, res: Response) => {
    // Adjust the path based on where your server file executes relative to the image
    const iconPath = path.resolve(__dirname, "./resources/icons/favicon.ico");
    res.sendFile(iconPath);
});

app.get("/", (req: Request, res: Response) => {
    const workerId = cluster.worker ? cluster.worker.id : "Master";
    
    res.status(200).json({
        status: "online",
        message: "CHAT Application API is operational.",
        metadata: {
            version: process.env.APP_VERSION || "1.0.0",
            environment: process.env.NODE_ENV || "development",
            worker_id: workerId,
            timestamp: new Date().toISOString(),
        },
        resources: {
            website: process.env.COMPANY_WEBSITE || "https://www.yourdomain.com",
            documentation: process.env.DOCS_URL || "https://docs.yourdomain.com/api",
            support: process.env.SUPPORT_EMAIL || "support@yourdomain.com"
        }
    });
});

app.get("/health", (req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        },
        encryption: ENABLE_ENCRYPTION,
    });
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(`${req.method} ${req.path} - ${err.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        ip: req.ip,
    });

    const statusCode = err.statusCode || HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;

    res.status(statusCode).json(
        createResponse(
            statusCode,
            err.message || "Internal server error",
            process.env.NODE_ENV === "development" ? { stack: err.stack } : null,
            true
        )
    );
});

const initializeDatabase = async () => {
    console.log("🔌 Warming database connection...");

    const start = performance.now();

    await db.sequelize.authenticate();

    await db.sequelize.query("SELECT 1");

    console.log(
        `✅ Database warm-up completed in ${(performance.now() - start).toFixed(2)} ms`
    );

    const pool = (db.sequelize.connectionManager as any).pool;

    console.log("🔥 DB POOL:", {
        size: pool.size,
        available: pool.available,
        using: pool.using,
        waiting: pool.waiting,
    });
};

// ============================================================================
// OPTIMIZED SERVER STARTUP
// ============================================================================
async function startServer(app: express.Express, port: number) {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 Starting Server Architecture");
    console.log("=".repeat(60));

    try {

        // ------------------------------------------------------------
        // 1. DATABASE WARM-UP
        // ------------------------------------------------------------
        timer.start("database-warmup");

        await initializeDatabase();

        timer.log("database-warmup", "🔌");
        
        timer.start("route-scanning");
        // Adjusted path assuming server.ts is at the root of src/
        const baseDirs = [join(__dirname, "modules")]; 
        const routeFiles = routeLoader.walkSync(baseDirs);
        timer.log("route-scanning", "🔍");

        timer.start("route-loading");
        await routeLoader.loadRoutes(app, routeFiles);
        timer.log("route-loading", "📦");

        timer.start("server-start");
        const server: Server = await new Promise((resolve, reject) => {
            const srv = app.listen(port, () => {
                resolve(srv);
            }).on('error', (err: any) => {
                reject(err);
            });
        });
        timer.log("server-start", "🌐");

        logger.info(`🚀 Server running on port ${port}`);


        timer.logTotal();
        setupGracefulShutdown(server);

        return server;
    } catch (error: any) {
        console.log("error",error)
        logger.error(`❌ Server startup failed: ${error.message}`);
        console.error("❌ Server startup failed:", error);
        process.exit(1);
    }
}

// ============================================================================
// GRACEFUL SHUTDOWN & MEMORY MANAGEMENT
// ============================================================================
function setupGracefulShutdown(server: Server) {
    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        console.log(`\n🛑 Received ${signal} - Shutting down gracefully...`);
        
        // 🔥 ULTIMATE FAILSAFE: Force kill if it takes longer than 3 seconds
        // .unref() ensures this timer doesn't keep the app alive on its own
        setTimeout(() => {
            console.error("⏳ Shutdown took too long. Forcing exit...");
            process.exit(1);
        }, 3000).unref(); 

        const shutdownTimer = new PerformanceTimer();

        try {
            // 1. Close HTTP Server (Tell Node to stop accepting new requests)
            shutdownTimer.start("close-server");
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
                // We don't need a timeout here anymore because the global failsafe handles it
            });
            shutdownTimer.log("close-server", "🌐");


            // 3. Clear all local JSON caches securely
            shutdownTimer.start("clear-cache");
            await LocalJsonHelper.clearAll(); 
            shutdownTimer.log("clear-cache", "🧹");

            // 3. Optional: Close Database
            // await sequelize.close();

            shutdownTimer.logTotal();
            process.exit(0);
        } catch (error) {
            console.error("❌ Error during shutdown:", error);
            process.exit(1);
        }
    };

    // Listen for Ctrl+C in terminal
    process.on("SIGINT", () => shutdown("SIGINT"));
    
    // Listen for system termination (Docker, PM2, Kubernetes)
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    process.on("uncaughtException", (err) => {
        logger.error("Uncaught Exception:", err);
        const criticalErrors = ["EADDRINUSE", "EACCES", "ENOMEM"];
        if (criticalErrors.includes((err as any).code)) shutdown("UNCAUGHT_EXCEPTION");
    });

    process.on("unhandledRejection", (reason) => {
        logger.error("Unhandled Rejection:", { reason });
    });
}

// Memory Monitoring
setInterval(() => {
    const mem = process.memoryUsage();
    const heapUsedMB = mem.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 500) {
        console.warn(`⚠️ High memory: ${heapUsedMB.toFixed(0)}MB`);
        // Safely cast global to any to access the exposed V8 gc() function
        if ((global as any).gc) {
            (global as any).gc();
            console.log("🗑️ Manual GC triggered");
        }
    }
}, 120000);

startServer(app, PORT);

export default app;