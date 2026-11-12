/**
 * Enhanced High-Performance Local JSON Cache System (TypeScript - ES6 Modules)
 * ✅ Handles 'conditions' from config
 * ✅ Concurrency-safe: single-flight loads/refreshes, DB count check once per N requests
 * ✅ Bounded memory: capped caches, bounded indexes, no orphaned timers/locks
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from "../../modules/index.js"; // Adjust based on your actual db path
import { QueryTypes } from 'sequelize';
import TABLE_VIEW_FOLDER_MAP from '../constants/id_constant/local.json.constant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// TYPES & INTERFACES
// ==========================================
export interface CacheMetadata {
    name: string;
    view_name: string | null;
    conditions: Record<string, any> | null;
    created_at: string;
    updated_at: string;
    expires_at: string;
    modified_at: string;
    ttl_ms: number;
    db_count_check_counter: number | null;
    data_length?: number;
    data?: any;
}

export interface TableConfig {
    folder_name?: string;
    json_file_name?: string;
    file_name?: string;
    name?: string;
    view_name?: string | null;
    conditions?: Record<string, any> | null;
    skipMemoryCache?: boolean;
}

export type TableRef = string | TableConfig;

// ==========================================
// SHARED HELPERS (DRY)
// ==========================================

/** Counts records for array data, or sums array lengths for { group: [...] } data. */
export function getDataLength(data: any): number {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object') {
        let total = 0;
        for (const v of Object.values(data)) if (Array.isArray(v)) total += v.length;
        return total;
    }
    return 0;
}

/**
 * Single-flight: concurrent callers with the same key share ONE in-progress promise.
 * This is what prevents the thundering herd (N parallel file reads / DB fetches).
 */
function singleFlight<T>(map: Map<string, Promise<T>>, key: string, fn: () => Promise<T>): Promise<T> {
    const existing = map.get(key);
    if (existing) return existing;
    const p: Promise<T> = fn().finally(() => {
        if (map.get(key) === p) map.delete(key);
    });
    map.set(key, p);
    return p;
}

/** Per-key async mutex. The entry is removed as soon as the key is idle (no leak). */
const _locks = new Map<string, Promise<void>>();
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = _locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const tail = prev.then(() => gate);
    _locks.set(key, tail);
    await prev; // gates never reject
    try {
        return await fn();
    } finally {
        release();
        if (_locks.get(key) === tail) _locks.delete(key);
    }
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
    try {
        return JSON.parse(await fs.readFile(filePath, 'utf-8')) as T;
    } catch (e: any) {
        if (e?.code !== 'ENOENT') console.warn(`⚠️ Could not read/parse ${filePath}: ${e?.message}`);
        return null;
    }
}

async function pathExists(p: string): Promise<boolean> {
    try { await fs.access(p); return true; } catch { return false; }
}

async function unlinkQuiet(p: string): Promise<void> {
    try { await fs.unlink(p); } catch (e: any) { if (e?.code !== 'ENOENT') throw e; }
}

/** Atomic write (tmp + rename) so concurrent readers never see a half-written JSON file. */
let _tmpSeq = 0;
async function writeFileAtomic(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.${++_tmpSeq}.tmp`;
    try {
        await fs.writeFile(tmp, content, 'utf-8');
        await fs.rename(tmp, filePath);
    } catch (e) {
        await unlinkQuiet(tmp).catch(() => { });
        throw e;
    }
}

const normalizeBool = (v: any) => (typeof v === 'boolean' ? Number(v) : v);

// ==========================================
// GRACEFUL SHUTDOWN REGISTRY
// ==========================================
const _shutdownHandlers = new Set<() => void | Promise<void>>();

function _registerShutdownHandler(fn: () => void | Promise<void>) {
    _shutdownHandlers.add(fn);
}

async function _runAllShutdownHandlers() {
    for (const fn of _shutdownHandlers) {
        try { await fn(); } catch (e: any) { console.error('Shutdown handler error:', e.message); }
    }
    _shutdownHandlers.clear();
}

// ==========================================
// TIME PARSER UTILITY
// ==========================================
export class TimeParser {
    static parseToMs(timeExpression: string | number | undefined): number {
        if (typeof timeExpression === 'number') {
            return timeExpression * 24 * 60 * 60 * 1000;
        }

        if (!timeExpression || typeof timeExpression !== 'string') {
            return 15 * 24 * 60 * 60 * 1000;
        }

        let totalMs = 0;
        const parts = timeExpression.split(',').map(p => p.trim());

        for (const part of parts) {
            const monthMatch = part.match(/^(\d+)\s*mn$/i);
            const dayMatch = part.match(/^(\d+)\s*d$/i);
            const hourMatch = part.match(/^(\d+)\s*h$/i);
            const minuteMatch = part.match(/^(\d+)\s*m$/i);

            if (monthMatch) {
                totalMs += parseInt(monthMatch[1]) * 30 * 24 * 60 * 60 * 1000;
            } else if (dayMatch) {
                totalMs += parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000;
            } else if (hourMatch) {
                totalMs += parseInt(hourMatch[1]) * 60 * 60 * 1000;
            } else if (minuteMatch) {
                totalMs += parseInt(minuteMatch[1]) * 60 * 1000;
            }
        }

        return totalMs > 0 ? totalMs : 15 * 24 * 60 * 60 * 1000;
    }

    static msToReadable(ms: number): string {
        const months = Math.floor(ms / (30 * 24 * 60 * 60 * 1000));
        ms %= (30 * 24 * 60 * 60 * 1000);

        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        ms %= (24 * 60 * 60 * 1000);

        const hours = Math.floor(ms / (60 * 60 * 1000));
        ms %= (60 * 60 * 1000);

        const minutes = Math.floor(ms / (60 * 1000));

        const parts = [];
        if (months > 0) parts.push(`${months}mn`);
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);

        return parts.length > 0 ? parts.join(',') : '0m';
    }
}

// ==========================================
// CONFIGURATION
// ==========================================
export class CacheConfig {
    static MAX_ENTRIES_FOR_MEMORY = 2000;
    static MAX_FILE_SIZE_MB = 3.0;
    static MAX_TOTAL_MEMORY_MB = 100;            // hard cap for ALL in-memory cache entries together
    static USE_METADATA_FILES = true;
    static DB_QUERY_TIMEOUT = 30000;
    static ENABLE_DB_OPERATIONS = true;
    static INITIAL_DB_COUNT_CHECK_COUNTER = 15;  // DB count check runs once per this many requests
    static DB_RETRY_BACKOFF_MS = 30000;          // after a failed refresh, wait before hitting the DB again
    static MAX_INDEXES = 100;                    // max key-indexes kept in memory
    static PRETTY_JSON = false;                  // pretty-printing bloats big files (set true for debugging)
}

// ==========================================
// ENHANCED MEMORY CACHE (Active pruning + size caps)
// ==========================================
export class MemoryCache {
    private _cache = new Map<string, CacheMetadata>();
    private _accessTimes = new Map<string, number>();
    private _cacheSizes = new Map<string, number>();
    public maxSize: number;
    public ttlSeconds: number;
    private _cleanupInterval: NodeJS.Timeout | null;
    private _onEvict?: (value: CacheMetadata) => void;

    constructor(maxSize = 100, ttlSeconds = 3600, onEvict?: (value: CacheMetadata) => void) {
        this.maxSize = maxSize;
        this.ttlSeconds = ttlSeconds;
        this._onEvict = onEvict;

        this._cleanupInterval = setInterval(() => this.prune(), 60000);
        this._cleanupInterval.unref?.();

        _registerShutdownHandler(() => this.destroy());
    }

    destroy() {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }
        this.clear();
    }

    private _isExpiredEntry(data: CacheMetadata, now = Date.now()): boolean {
        return !!data.expires_at && now >= new Date(data.expires_at).getTime();
    }

    prune() {
        const now = Date.now();
        let prunedCount = 0;

        for (const [key, data] of [...this._cache.entries()]) {
            if (this._isExpiredEntry(data, now)) {
                this.invalidate(key);
                prunedCount++;
            }
        }
        if (prunedCount > 0) {
            console.log(`🧹 MemoryCache: Auto-pruned ${prunedCount} expired items.`);
        }
    }

    private _estimateSizeBytes(data: any): number {
        try {
            return Buffer.byteLength(JSON.stringify(data), 'utf-8');
        } catch {
            return 1024 * 1024;
        }
    }

    /** Cheap length check first; the (expensive) stringify happens only once, and only if needed. */
    private _measure(data: CacheMetadata): { cacheable: boolean; reason: string; size: number } {
        if (getDataLength(data.data) >= CacheConfig.MAX_ENTRIES_FOR_MEMORY) {
            return { cacheable: false, reason: 'too_many_entries', size: 0 };
        }
        const size = this._estimateSizeBytes(data);
        if (size >= CacheConfig.MAX_FILE_SIZE_MB * 1024 * 1024) {
            return { cacheable: false, reason: 'too_large', size };
        }
        return { cacheable: true, reason: 'cacheable', size };
    }

    private _totalBytes(): number {
        let total = 0;
        for (const s of this._cacheSizes.values()) total += s;
        return total;
    }

    private _evictOldest(except: string): boolean {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [k, time] of this._accessTimes.entries()) {
            if (k !== except && time < oldestTime) {
                oldestTime = time;
                oldestKey = k;
            }
        }
        if (!oldestKey) return false;
        this.invalidate(oldestKey);
        return true;
    }

    get(key: string): CacheMetadata | null {
        const data = this._cache.get(key);
        if (!data) return null;

        const now = Date.now();
        if (this._isExpiredEntry(data, now)) {
            this.invalidate(key);
            return null;
        }

        this._accessTimes.set(key, now / 1000);
        return data;
    }

    set(key: string, value: CacheMetadata): { cached: boolean; reason: string } {
        const { cacheable, reason, size } = this._measure(value);
        if (!cacheable) {
            this.invalidate(key);
            return { cached: false, reason };
        }

        const maxTotal = CacheConfig.MAX_TOTAL_MEMORY_MB * 1024 * 1024;
        const existing = this._cacheSizes.get(key) ?? 0;
        const needsRoom = () =>
            (!this._cache.has(key) && this._cache.size >= this.maxSize) ||
            (this._totalBytes() - existing + size > maxTotal);

        while (needsRoom()) {
            if (!this._evictOldest(key)) break;
        }

        this._cache.set(key, value);
        this._accessTimes.set(key, Date.now() / 1000);
        this._cacheSizes.set(key, size);
        return { cached: true, reason: 'cached' };
    }

    invalidate(key: string) {
        const value = this._cache.get(key);
        this._cache.delete(key);
        this._accessTimes.delete(key);
        this._cacheSizes.delete(key);
        if (value && this._onEvict) {
            try { this._onEvict(value); } catch { /* never let a hook break the cache */ }
        }
    }

    clear() {
        this._cache.clear();
        this._accessTimes.clear();
        this._cacheSizes.clear();
    }
}

// ==========================================
// INDEX MANAGER (versioned, LRU-bounded)
// One structure serves unique lookups, group lookups and batch lookups.
// Each index remembers the data "version" it was built from, so a stale index is never served.
// ==========================================
export class IndexManager {
    private _indexes = new Map<string, { version: string; groups: Map<string, any[]> }>();
    private _maxIndexes: number;

    constructor(maxIndexes = CacheConfig.MAX_INDEXES) {
        this._maxIndexes = maxIndexes;
    }

    private static _key(tableName: string, keyName: string) {
        return `${tableName}\u0000${keyName}`;
    }

    static groupBy(data: any[], keyName: string): Map<string, any[]> {
        const groups = new Map<string, any[]>();
        for (const item of data) {
            const val = item?.[keyName];
            if (val === undefined || val === null) continue;
            const k = String(val);
            const bucket = groups.get(k);
            if (bucket) bucket.push(item); else groups.set(k, [item]);
        }
        return groups;
    }

    get(tableName: string, keyName: string, version: string): Map<string, any[]> | null {
        const key = IndexManager._key(tableName, keyName);
        const entry = this._indexes.get(key);
        if (!entry) return null;
        if (entry.version !== version) {
            this._indexes.delete(key);
            return null;
        }
        // LRU touch
        this._indexes.delete(key);
        this._indexes.set(key, entry);
        return entry.groups;
    }

    /** Builds the index; only stores it when `store` is true (skip for huge tables). */
    build(tableName: string, keyName: string, data: any[], version: string, store = true): Map<string, any[]> {
        const groups = IndexManager.groupBy(data, keyName);
        if (store) {
            this._indexes.set(IndexManager._key(tableName, keyName), { version, groups });
            while (this._indexes.size > this._maxIndexes) {
                const oldest = this._indexes.keys().next().value;
                if (oldest === undefined) break;
                this._indexes.delete(oldest);
            }
        }
        return groups;
    }

    invalidate(tableName: string) {
        const prefix = `${tableName}\u0000`;
        for (const key of [...this._indexes.keys()]) {
            if (key.startsWith(prefix)) this._indexes.delete(key);
        }
    }

    clear() { this._indexes.clear(); }
}

const _indexManager = new IndexManager();
// When a table leaves the memory cache, drop its indexes too (they hold references to its rows).
const _memoryCache = new MemoryCache(50, 1800, (value) => _indexManager.invalidate(value.name));

const indexVersion = (data: CacheMetadata) => `${data.updated_at}|${data.expires_at}`;

// ==========================================
// METADATA MANAGER
// ==========================================
export class MetadataManager {
    static _getMetadataPath(dataFilePath: string): string {
        const parsed = path.parse(dataFilePath);
        return path.join(parsed.dir, `${parsed.name}.meta.json`);
    }

    static async loadMetadata(dataFilePath: string): Promise<Partial<CacheMetadata> | null> {
        if (!CacheConfig.USE_METADATA_FILES) return null;
        return readJsonSafe<Partial<CacheMetadata>>(this._getMetadataPath(dataFilePath));
    }

    static async saveMetadata(dataFilePath: string, metadata: Partial<CacheMetadata>) {
        if (!CacheConfig.USE_METADATA_FILES) return;
        try {
            await writeFileAtomic(this._getMetadataPath(dataFilePath), JSON.stringify(metadata, null, 2));
        } catch (e: any) { console.error("Meta save failed", e.message); }
    }

    static extractMetadata(data: CacheMetadata): Partial<CacheMetadata> {
        return {
            name: data.name,
            view_name: data.view_name,
            conditions: data.conditions || null,
            created_at: data.created_at,
            updated_at: data.updated_at,
            expires_at: data.expires_at,
            modified_at: data.modified_at,
            ttl_ms: data.ttl_ms,
            db_count_check_counter: data.db_count_check_counter,
            data_length: getDataLength(data.data)
        };
    }

    static _getDataLength(data: any): number {
        return getDataLength(data);
    }

    static mergeMetadata(data: CacheMetadata, metadata: Partial<CacheMetadata>): CacheMetadata {
        return { ...data, ...metadata };
    }
}

// ==========================================
// DATABASE HELPER
// ==========================================
export class DatabaseHelper {
    static isValidViewName(viewName: string | null | undefined): boolean {
        if (!viewName || typeof viewName !== 'string') return false;
        const trimmed = viewName.trim();
        if (trimmed.length === 0) return false;
        const dangerousPatterns = /[;'"\\]|--/;
        if (dangerousPatterns.test(trimmed)) {
            console.error(`❌ Invalid view_name detected: ${viewName}`);
            return false;
        }
        return true;
    }

    /** Uses bound parameters (replacements) instead of string-escaping values. */
    static _buildWhereClause(conditions: Record<string, any> | null): { sql: string; replacements: Record<string, any> } {
        const clauses: string[] = [];
        const replacements: Record<string, any> = {};
        let i = 0;

        for (const [key, value] of Object.entries(conditions ?? {})) {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;

            if (value === null) {
                clauses.push(`${key} IS NULL`);
                continue;
            }
            const param = `cond_${i++}`;
            replacements[param] =
                typeof value === 'boolean' ? (value ? 1 : 0) :
                typeof value === 'number' ? value : String(value);
            clauses.push(`${key} = :${param}`);
        }

        return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', replacements };
    }

    /** Returns rows, or null when the query FAILED (so callers can tell "error" from "empty"). */
    private static async _select(columns: string, viewName: string, conditions: Record<string, any> | null): Promise<any[] | null> {
        if (!CacheConfig.ENABLE_DB_OPERATIONS || !this.isValidViewName(viewName)) return null;
        try {
            const { sql, replacements } = this._buildWhereClause(conditions);
            const rows = await db.sequelize.query(
                `SELECT ${columns} FROM ${viewName}${sql}`,
                // Cast to 'any' to bypass TS strict interface checks for 'timeout'
                { type: QueryTypes.SELECT, timeout: CacheConfig.DB_QUERY_TIMEOUT, raw: true, replacements } as any
            );
            return (rows as any[]) || [];
        } catch (e: any) {
            console.error(`❌ DB query failed for ${viewName}:`, e?.message);
            return null;
        }
    }

    static async getDbCount(viewName: string, conditions: Record<string, any> | null = null): Promise<number | null> {
        const rows = await this._select('COUNT(*) as count', viewName, conditions);
        if (rows === null) return null;
        return parseInt((rows[0] as any)?.count || 0, 10);
    }

    /** null = query failed, [] = view genuinely empty. */
    static async fetchAllFromDb(viewName: string, conditions: Record<string, any> | null = null): Promise<any[] | null> {
        return this._select('*', viewName, conditions);
    }
}

// ==========================================
// OPTIMIZED LOCAL JSON DB
// ==========================================
export class OptimizedLocalJsonDB {
    static _BASE_PATH = path.join(__dirname, '../../resources/json');
    static _WRITE_QUEUE = new Map<string, { filePath: string, data: CacheMetadata, timestamp: number }>();
    static _writeTimeout: NodeJS.Timeout | null = null;
    static _flushChain: Promise<void> = Promise.resolve();

    // Per-cache-key request counters for the DB count check (source of truth; independent of file reads)
    static _COUNTERS = new Map<string, number>();
    // Single-flight maps
    static _LOADS = new Map<string, Promise<CacheMetadata | null>>();
    static _REFRESHES = new Map<string, Promise<CacheMetadata | null>>();

    public tableName: string;
    public viewName: string | null;
    public folderName: string;
    public conditions: Record<string, any> | null;
    public skipMemoryCache: boolean;
    public jsonFileName: string;
    public expiryTime: string | number;
    public ttlMs: number;
    public hasValidViewName: boolean;
    public filePath: string;
    public _cacheKey: string;

    constructor(configOrName: TableRef, expiryTime: string | number = "15d", skipMemoryCache = false) {
        let mapping: TableConfig;
        this.skipMemoryCache = skipMemoryCache;

        if (typeof configOrName === 'string') {
            if (TABLE_VIEW_FOLDER_MAP && (TABLE_VIEW_FOLDER_MAP as any)[configOrName]) {
                mapping = (TABLE_VIEW_FOLDER_MAP as any)[configOrName];
                this.tableName = configOrName;
            }
            else {
                const parts = configOrName.split(/[/\\]/);
                let fileName = parts.pop()!;
                if (!fileName.endsWith('.json')) fileName += '.json';
                const folderName = parts.length > 0 ? parts.join('/') : 'custom';

                mapping = {
                    folder_name: folderName,
                    json_file_name: fileName,
                    view_name: null,
                    conditions: null
                };
                this.tableName = configOrName;
            }
        }
        else if (typeof configOrName === 'object' && configOrName !== null) {
            mapping = configOrName;
            const fileName = mapping.json_file_name || mapping.file_name || 'unknown.json';
            this.tableName = mapping.name || `${mapping.folder_name || 'root'}/${fileName}`;
        }
        else {
            throw new Error('❌ Invalid constructor argument');
        }

        this.viewName = mapping.view_name || null;
        this.folderName = mapping.folder_name || this.tableName;
        this.conditions = mapping.conditions || null;

        if (mapping.skipMemoryCache === true) {
            this.skipMemoryCache = true;
        }

        const jsonFileName = mapping.json_file_name || mapping.file_name || `${this.tableName}.json`;
        this.jsonFileName = jsonFileName.replace('.json5', '.json');

        this.expiryTime = expiryTime;
        this.ttlMs = TimeParser.parseToMs(expiryTime);

        this.hasValidViewName = !!this.viewName && DatabaseHelper.isValidViewName(this.viewName);

        // No sync fs calls here: this constructor runs on every request.
        // The folder is created (async, recursive) at write time instead.
        this.filePath = path.join(OptimizedLocalJsonDB._BASE_PATH, this.folderName, this.jsonFileName);
        this._cacheKey = `${this.tableName}:${expiryTime}`;
    }

    static _getInstance(tableRef: TableRef, expiryTime: string | number, skipMemoryCache = false) {
        return new OptimizedLocalJsonDB(tableRef, expiryTime, skipMemoryCache);
    }

    // ---------- loading ----------

    async _loadFromMemoryOrFile(): Promise<CacheMetadata | null> {
        if (!this.skipMemoryCache) {
            const cached = _memoryCache.get(this._cacheKey);
            if (cached) return cached;
        }

        // Concurrent misses share ONE file read + JSON.parse
        return singleFlight(OptimizedLocalJsonDB._LOADS, this._cacheKey, async () => {
            let data = await readJsonSafe<CacheMetadata>(this.filePath);
            if (!data) return null;

            const metadata = await MetadataManager.loadMetadata(this.filePath);
            if (metadata) data = MetadataManager.mergeMetadata(data, metadata);

            if (!this.skipMemoryCache) _memoryCache.set(this._cacheKey, data);
            return data;
        });
    }

    // ---------- persistence ----------

    static async _writeToDisk(filePath: string, data: CacheMetadata) {
        try {
            await writeFileAtomic(filePath, JSON.stringify(data, null, CacheConfig.PRETTY_JSON ? 2 : 0));
            await MetadataManager.saveMetadata(filePath, MetadataManager.extractMetadata(data));
        } catch (e: any) {
            console.error(`Failed to save file ${filePath}:`, e.message);
        }
    }

    async _saveLazy(data: CacheMetadata, force: boolean) {
        _indexManager.invalidate(this.tableName); // free indexes built from the old rows

        const { cached } = this.skipMemoryCache
            ? { cached: false }
            : _memoryCache.set(this._cacheKey, data);

        if (!cached) {
            OptimizedLocalJsonDB._WRITE_QUEUE.delete(this._cacheKey);
            await OptimizedLocalJsonDB._writeToDisk(this.filePath, data);
            return;
        }

        OptimizedLocalJsonDB._WRITE_QUEUE.set(this._cacheKey, { filePath: this.filePath, data, timestamp: Date.now() });
        if (force || OptimizedLocalJsonDB._WRITE_QUEUE.size >= 5) await OptimizedLocalJsonDB._flushWriteQueue();
        else this._scheduleFlush();
    }

    _scheduleFlush() {
        if (OptimizedLocalJsonDB._writeTimeout) clearTimeout(OptimizedLocalJsonDB._writeTimeout);
        OptimizedLocalJsonDB._writeTimeout = setTimeout(() => {
            OptimizedLocalJsonDB._writeTimeout = null;
            void OptimizedLocalJsonDB._flushWriteQueue();
        }, 5000);
        OptimizedLocalJsonDB._writeTimeout.unref?.();
    }

    /** Flushes are serialized, so two flushes can never write the same file at the same time. */
    static _flushWriteQueue(): Promise<void> {
        this._flushChain = this._flushChain.then(() => this._doFlush());
        return this._flushChain;
    }

    private static async _doFlush() {
        if (this._writeTimeout) {
            clearTimeout(this._writeTimeout);
            this._writeTimeout = null;
        }
        if (this._WRITE_QUEUE.size === 0) return;

        const snapshot = [...this._WRITE_QUEUE.values()];
        this._WRITE_QUEUE.clear();
        for (const val of snapshot) await this._writeToDisk(val.filePath, val.data);
    }

    // ---------- freshness ----------

    _isExpired(data: CacheMetadata): boolean {
        try {
            if (!data.expires_at) return true;
            return Date.now() >= new Date(data.expires_at).getTime();
        } catch { return true; }
    }

    async _getDbCount(): Promise<number | null> {
        if (!this.hasValidViewName) return null;
        return DatabaseHelper.getDbCount(this.viewName as string, this.conditions);
    }

    /** null = DB failure, [] = empty. */
    async _fetchFullFromDb(): Promise<any[] | null> {
        if (!this.hasValidViewName) return [];
        return DatabaseHelper.fetchAllFromDb(this.viewName as string, this.conditions);
    }

    /**
     * Atomic (synchronous) claim of the DB count check.
     * Exactly ONE request per cycle gets `true`; the counter is reset BEFORE any await,
     * so a burst of concurrent requests can never trigger more than one check.
     */
    _takeCountCheckTurn(data: CacheMetadata): boolean {
        const counters = OptimizedLocalJsonDB._COUNTERS;
        const current = counters.get(this._cacheKey) ?? data.db_count_check_counter ?? CacheConfig.INITIAL_DB_COUNT_CHECK_COUNTER;
        if (current <= 0) {
            counters.set(this._cacheKey, CacheConfig.INITIAL_DB_COUNT_CHECK_COUNTER);
            return true;
        }
        counters.set(this._cacheKey, current - 1);
        return false;
    }

    _resetCounter(data: CacheMetadata) {
        if (this.hasValidViewName) {
            data.db_count_check_counter = CacheConfig.INITIAL_DB_COUNT_CHECK_COUNTER;
            OptimizedLocalJsonDB._COUNTERS.set(this._cacheKey, CacheConfig.INITIAL_DB_COUNT_CHECK_COUNTER);
        } else {
            data.db_count_check_counter = null;
        }
    }

    _createCacheStructure(freshData: any): CacheMetadata {
        const now = new Date();
        const data: CacheMetadata = {
            name: this.tableName,
            view_name: this.viewName || null,
            conditions: this.conditions,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            expires_at: new Date(now.getTime() + this.ttlMs).toISOString(),
            modified_at: now.toISOString(),
            ttl_ms: this.ttlMs,
            db_count_check_counter: null,
            data: freshData
        };
        this._resetCounter(data);
        return data;
    }

    /** Full DB reload, shared by all concurrent callers. A DB *failure* never wipes the local cache. */
    private _reloadFromDb(reason: string, existing: CacheMetadata | null): Promise<CacheMetadata | null> {
        return singleFlight(OptimizedLocalJsonDB._REFRESHES, this._cacheKey, async () => {
            console.log(`🔄 Refreshing cache for ${this.tableName} (reason: ${reason})`);
            const fresh = await this._fetchFullFromDb();

            if (fresh === null) {
                console.warn(`⚠️ DB unavailable for ${this.tableName}; keeping ${existing ? 'existing local' : 'no'} data.`);
                if (existing && this._isExpired(existing)) {
                    // back off so we don't hammer a failing DB on every request
                    existing.expires_at = new Date(Date.now() + CacheConfig.DB_RETRY_BACKOFF_MS).toISOString();
                }
                return existing;
            }

            if (fresh.length === 0) {
                console.log(`🧹 DB is empty for ${this.tableName}. Deleting local cache.`);
                await this._invalidate();
                return null;
            }

            const next = this._createCacheStructure(fresh);
            if (existing?.created_at) next.created_at = existing.created_at;
            await this._saveLazy(next, true);
            return next;
        });
    }

    /** Returns the live (shared, NOT cloned) cache object after expiry / count validation. */
    async _getFreshData(): Promise<CacheMetadata | null> {
        const data = await this._loadFromMemoryOrFile();

        if (!data) return this.hasValidViewName ? this._reloadFromDb('missing', null) : null;

        if (this._isExpired(data)) {
            console.log(`⏳ [Expiry] Cache expired for ${this.tableName}.`);
            if (!this.hasValidViewName) {
                await this._invalidate();
                return null;
            }
            return this._reloadFromDb('expired', data);
        }

        if (this.hasValidViewName && this._takeCountCheckTurn(data)) {
            const dbCount = await this._getDbCount();
            const localLength = getDataLength(data.data);
            if (dbCount !== null && dbCount !== localLength) {
                console.log(`⚠️ Count mismatch! DB: ${dbCount}, Local: ${localLength}. Refreshing...`);
                return this._reloadFromDb('count_mismatch', data);
            }
        }
        return data;
    }

    async _invalidate(): Promise<boolean> {
        _memoryCache.invalidate(this._cacheKey);
        _indexManager.invalidate(this.tableName);
        OptimizedLocalJsonDB._WRITE_QUEUE.delete(this._cacheKey); // don't resurrect a deleted file
        OptimizedLocalJsonDB._COUNTERS.delete(this._cacheKey);
        try {
            await unlinkQuiet(this.filePath);
            await unlinkQuiet(MetadataManager._getMetadataPath(this.filePath));
            console.log(`🗑️ Deleted file: ${this.tableName}`);
            return true;
        } catch (e: any) {
            console.error(`Failed to invalidate ${this.tableName}:`, e.message);
            return false;
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    static async getAll(tableRef: TableRef, expiryTime: string | number = "15d", filterField: string | null = null, filterValue: any = null): Promise<any[]> {
        const instance = this._getInstance(tableRef, expiryTime);
        const data = await instance._getFreshData();
        const content = data?.data;
        if (!content) return [];

        if (Array.isArray(content)) {
            const list = filterField !== null ? this._filterList(content, filterField, filterValue) : content;
            return this._deepClone(list); // always a clone: callers can never mutate the cache
        }
        return typeof content === 'object' ? this._deepClone(content) : [];
    }

    static _deepClone(value: any): any {
        if (value === null || value === undefined) return value;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return value;
        }
    }

    static async save(tableRef: TableRef, dataEntry: any = null, keyName: string | null = null, keyValue: any = null, newFile: boolean | null = null, expiryTime: string | number = "15d"): Promise<CacheMetadata | []> {
        const refLog = typeof tableRef === 'string' ? tableRef : JSON.stringify(tableRef);
        console.log(`🟢 [Start] save() called for: ${refLog}`);

        if (!tableRef || (typeof tableRef !== 'string' && typeof tableRef !== 'object')) {
            throw new Error('Invalid tableRef: must be a string or object');
        }

        const instance = this._getInstance(tableRef, expiryTime);

        return withLock(instance._cacheKey, async () => {
            try {
                if (newFile === true) {
                    console.log("🗑️ [Explicit New] Deleting old file/cache before processing...");
                    await instance._invalidate();
                }

                let data = await instance._loadFromMemoryOrFile();

                // Recovery from DB is pointless when we're about to overwrite everything anyway
                if (!data && instance.hasValidViewName && newFile !== true) {
                    console.log(`📂 [Recovery] File missing for ${instance.tableName}, fetching from DB...`);
                    const freshData = await instance._fetchFullFromDb();
                    if (freshData === null) {
                        console.warn("⚠️ [Recovery Failed] Could not fetch from DB");
                    } else {
                        if (freshData.length === 0) return [];
                        data = instance._createCacheStructure(freshData);
                        console.log(`✅ [Recovery] Restored ${freshData.length} records from DB.`);
                        if (newFile === null) newFile = false;
                    }
                }

                if (!data) {
                    console.log("📝 [Init] Creating new empty data structure");
                    data = instance._createCacheStructure([]);
                    if (newFile === null) newFile = true;
                }

                if (newFile === null) {
                    if (instance._isExpired(data)) {
                        console.log("🔄 [Auto] Data expired -> REFRESH mode");
                        newFile = true;
                    }
                    else if (instance.hasValidViewName) {
                        const dbCount = await instance._getDbCount();
                        const localLength = getDataLength(data.data);

                        if (dbCount !== null && dbCount !== localLength) {
                            console.log(`🔄 [Auto] Count mismatch (DB:${dbCount} vs Local:${localLength})`);
                            if (dataEntry === null || Array.isArray(dataEntry)) {
                                newFile = true;
                            } else {
                                console.log("👉 Single entry detected. Using Upsert to prevent data loss.");
                                newFile = false;
                            }
                        } else {
                            newFile = false;
                        }
                    }
                    else {
                        newFile = keyName === null && keyValue === null;
                    }
                }

                if (newFile === true) {
                    console.log("🆕 [Mode] Overwrite / Full Refresh");

                    if (dataEntry === null) {
                        if (instance.hasValidViewName) {
                            const fresh = await instance._fetchFullFromDb();
                            if (fresh === null) throw new Error(`DB fetch failed for ${instance.tableName}; refusing to overwrite cache with empty data`);
                            data.data = fresh;
                        } else {
                            data.data = [];
                        }
                    } else {
                        data.data = Array.isArray(dataEntry) ? dataEntry : [dataEntry];
                    }
                    data.conditions = instance.conditions;
                }
                else if (dataEntry !== null) {
                    console.log("🔄 [Mode] Upsert (Modify specific entry)");
                    if (!Array.isArray(data.data)) data.data = [];
                    const list = data.data as any[];

                    if (keyName && keyValue !== null) {
                        const idx = list.findIndex(i => i && String(i[keyName]) === String(keyValue));
                        if (idx >= 0) {
                            list[idx] = dataEntry;
                            console.log(`✅ Updated existing entry: ${keyValue}`);
                        } else {
                            list.push(dataEntry);
                            console.log(`✅ Added new entry: ${keyValue}`);
                        }
                    } else {
                        list.push(dataEntry);
                    }
                }

                const nowObj = new Date();
                data.modified_at = nowObj.toISOString();
                data.updated_at = nowObj.toISOString();

                if (newFile === true || instance._isExpired(data)) {
                    data.expires_at = new Date(nowObj.getTime() + instance.ttlMs).toISOString();
                }

                instance._resetCounter(data);
                await instance._saveLazy(data, true); // also invalidates this table's indexes

                return data;
            } catch (error) {
                console.error("❌ [Critical Failure] save()", error);
                throw error;
            }
        });
    }

    static async deleteEntry(tableRef: TableRef, keyName: string, keyValue: any, expiryTime: string | number = "15d"): Promise<boolean> {
        const instance = this._getInstance(tableRef, expiryTime);

        return withLock(instance._cacheKey, async () => {
            let data = await instance._loadFromMemoryOrFile();

            if (!data && instance.hasValidViewName) {
                console.log(`📂 [Delete Recovery] File missing for ${instance.tableName}, hydrating before delete...`);
                const freshData = await instance._fetchFullFromDb();
                if (freshData !== null) data = instance._createCacheStructure(freshData);
            }

            if (!data || !Array.isArray(data.data)) {
                console.warn(`⚠️ [Delete] No data found to delete from for ${instance.tableName}`);
                return false;
            }

            const originalLen = data.data.length;
            const targetValue = String(keyValue);
            data.data = data.data.filter((e: any) => {
                if (!e || e[keyName] === undefined) return true;
                return String(e[keyName]) !== targetValue;
            });

            if (data.data.length === originalLen) {
                console.log(`ℹ️ [Delete] Key ${keyValue} not found in ${instance.tableName}`);
                return false;
            }

            console.log(`✅ [Delete] Removed key ${keyValue} from ${instance.tableName}. New count: ${data.data.length}`);
            const nowObj = new Date();
            data.modified_at = nowObj.toISOString();
            data.updated_at = nowObj.toISOString();
            data.data_length = data.data.length;
            instance._resetCounter(data);

            await instance._saveLazy(data, true);
            return true;
        });
    }

    static _filterList(data: any[], field: string, value: any): any[] {
        if (!Array.isArray(data)) return [];
        const target = normalizeBool(value);
        return data.filter(i => i && i[field] !== undefined && normalizeBool(i[field]) === target);
    }

    static _matchesFilter(item: any, field: string, target: any): boolean {
        if (!item || item[field] === undefined) return false;
        return normalizeBool(item[field]) === normalizeBool(target);
    }

    /**
     * Returns a lookup function (value -> matching rows, NOT cloned).
     * Uses a versioned index (rebuilt automatically when data changes). Huge tables get a
     * throw-away index instead of one pinned in memory.
     */
    private static async _keyResolver(instance: OptimizedLocalJsonDB, keyName: string): Promise<(value: any) => any[]> {
        const data = await instance._getFreshData();
        const list: any[] = Array.isArray(data?.data) ? data!.data : [];
        if (!data || list.length === 0) return () => [];

        const version = indexVersion(data);
        const groups =
            _indexManager.get(instance.tableName, keyName, version) ??
            _indexManager.build(instance.tableName, keyName, list, version, list.length < CacheConfig.MAX_ENTRIES_FOR_MEMORY);

        return (value: any) => groups.get(value === null || value === undefined ? '' : String(value)) ?? [];
    }

    static async getByKey(tableRef: TableRef, keyName: string, keyValue: any, expiryTime: string | number = "15d", filterField: string | null = null, filterValue: any = null): Promise<any | null> {
        const instance = this._getInstance(tableRef, expiryTime);
        const find = await this._keyResolver(instance, keyName);
        const matches = find(keyValue);
        const result = matches.length > 0 ? matches[matches.length - 1] : null;

        if (!result) return null;
        if (filterField !== null && !this._matchesFilter(result, filterField, filterValue)) return null;
        return this._deepClone(result);
    }

    static async getAllByKey(tableRef: TableRef, keyName: string, keyValue: any, expiryTime: string | number = "15d"): Promise<any[]> {
        const instance = this._getInstance(tableRef, expiryTime);
        const find = await this._keyResolver(instance, keyName);
        return this._deepClone(find(keyValue));
    }

    static async getByKeysBatch(tableRef: TableRef, keyName: string, keyValues: any[], expiryTime: string | number = "15d", filterField: string | null = null, filterValue: any = null): Promise<any[]> {
        const instance = this._getInstance(tableRef, expiryTime);
        const find = await this._keyResolver(instance, keyName);

        let results = keyValues
            .map(kv => { const m = find(kv); return m.length > 0 ? m[m.length - 1] : undefined; })
            .filter(item => item !== undefined);
        if (filterField !== null) results = this._filterList(results, filterField, filterValue);
        return this._deepClone(results);
    }

    static async getFileStatus(tableRef: TableRef, expiryTime: string | number = "15d"): Promise<Record<string, any>> {
        try {
            const instance = this._getInstance(tableRef, expiryTime);
            const cacheData = _memoryCache.get(instance._cacheKey);
            const fileExists = await pathExists(instance.filePath);
            let stats = null;
            if (fileExists) {
                const fileStats = await fs.stat(instance.filePath);
                stats = {
                    size_bytes: fileStats.size,
                    size_mb: (fileStats.size / (1024 * 1024)).toFixed(2),
                    modified_at: fileStats.mtime
                };
            }

            return {
                table_name: instance.tableName,
                view_name: instance.viewName,
                file_path: instance.filePath,
                exists: fileExists,
                in_memory: cacheData !== null,
                has_view: instance.hasValidViewName,
                db_count_check_counter: OptimizedLocalJsonDB._COUNTERS.get(instance._cacheKey) ?? cacheData?.db_count_check_counter ?? null,
                expires_at: cacheData?.expires_at || null,
                ttl_readable: cacheData?.ttl_ms ? TimeParser.msToReadable(cacheData.ttl_ms) : null,
                stats
            };
        } catch (error: any) {
            return { error: error.message, exists: false };
        }
    }

    static async deleteFile(tableRef: TableRef, expiryTime: string | number = "15d"): Promise<boolean> {
        return this.invalidate(tableRef, expiryTime);
    }

    static async invalidate(tableRef: TableRef, expiryTime: string | number = "15d"): Promise<boolean> {
        return this._getInstance(tableRef, expiryTime)._invalidate();
    }

    static async clearAll(): Promise<boolean> {
        // NOTE: no longer runs the shutdown handlers here — that used to destroy the MemoryCache's
        // prune timer permanently, so expired entries were never pruned after the first clearAll().
        _memoryCache.clear();
        _indexManager.clear();
        this._COUNTERS.clear();
        this._WRITE_QUEUE.clear();

        if (this._writeTimeout) {
            clearTimeout(this._writeTimeout);
            this._writeTimeout = null;
        }
        try {
            await fs.rm(this._BASE_PATH, { recursive: true, force: true });
            await fs.mkdir(this._BASE_PATH, { recursive: true });
            console.log('🧹 CLEARED ALL CACHE AND FILES');
            return true;
        } catch (error: any) {
            console.error('❌ Failed to clear all cache:', error.message);
            return false;
        }
    }

    /** Call from your SIGTERM/SIGINT handler: flushes pending writes, stops timers. */
    static async shutdown(): Promise<void> {
        await this._flushWriteQueue();
        await _runAllShutdownHandlers();
    }

    static async getAllCachedTables(): Promise<Record<string, any>[]> {
        const tables: Record<string, any>[] = [];
        try {
            if (!(await pathExists(this._BASE_PATH))) return tables;
            const folders = await fs.readdir(this._BASE_PATH);
            for (const folder of folders) {
                const folderPath = path.join(this._BASE_PATH, folder);
                if (!(await fs.stat(folderPath)).isDirectory()) continue;

                for (const file of await fs.readdir(folderPath)) {
                    if (!file.endsWith('.json') || file.endsWith('.meta.json')) continue;

                    const filePath = path.join(folderPath, file);
                    const fileStats = await fs.stat(filePath);
                    // Prefer the small .meta.json; only parse the big data file as a fallback
                    const info =
                        (await MetadataManager.loadMetadata(filePath)) ??
                        (await readJsonSafe<CacheMetadata>(filePath));
                    if (!info) continue;

                    tables.push({
                        name: info.name || file,
                        view_name: info.view_name || null,
                        file_path: filePath,
                        size_mb: (fileStats.size / (1024 * 1024)).toFixed(2),
                        modified_at: fileStats.mtime,
                        expires_at: info.expires_at || null,
                        is_expired: info.expires_at ? Date.now() >= new Date(info.expires_at).getTime() : false,
                        db_count_check_counter: info.db_count_check_counter || null,
                        ttl_readable: info.ttl_ms ? TimeParser.msToReadable(info.ttl_ms) : null,
                        record_count: info.data_length ?? getDataLength((info as CacheMetadata).data)
                    });
                }
            }
        } catch (error: any) { console.error('Failed to get all cached tables:', error.message); }
        return tables;
    }
}

_registerShutdownHandler(() => OptimizedLocalJsonDB._flushWriteQueue());
process.once('beforeExit', () => { void OptimizedLocalJsonDB._flushWriteQueue(); });

export const LocalJsonDB = OptimizedLocalJsonDB;
export default OptimizedLocalJsonDB;