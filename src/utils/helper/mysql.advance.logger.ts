/*
 * ARCHITECTURE OVERVIEW: Centralized error triage and normalization utility. Classifies exceptions into
 * DATABASE, NON_DATABASE, or COMPLETELY_UNKNOWN and returns two audiences' worth of information:
 *   - errorMessage  -> safe, plain-language text for end users / UI
 *   - developerHint -> root-cause + how-to-fix text for developers (never sent to clients in production)
 *
 * HOW IT WORKS:
 * 1. resolve() triages origin (pass-through, null, primitive, DB, JS Error, untyped object).
 * 2. DATABASE errors are looked up in a frozen rule table keyed by MySQL errno (O(1), no giant switch).
 *    Each rule = { type, severity, httpStatus, build(rawMessage) }.
 * 3. All regexes are precompiled once; UI-name formatting is memoized.
 *
 * USAGE:
 *   const { errorType, errorMessage, developerHint } = MysqlAdvanceLogger.resolve(error);
 *   const { statusCode, message } = parseControllerError(error);   // inside controllers
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorSource = "DATABASE" | "NON_DATABASE" | "COMPLETELY_UNKNOWN";

export enum ErrorSeverity {
    Info = "Info",
    Warning = "Warning",
    Critical = "Critical",
}

export interface ErrorMeta {
    table?: string;
    column?: string;
    value?: string;
}

export interface AppErrorResult {
    errorSource: ErrorSource;
    /** Short category, e.g. "Duplicate Entry", "TypeError" */
    errorType: string;
    /** Safe, plain-language message for UI / API clients */
    errorMessage: string;
    severity: ErrorSeverity;
    /** MySQL errno or other code */
    code?: number | string;
    timestamp: Date;
    /** Raw technical text for log sinks (never show to end users) */
    technicalDetails?: string;
    /** Suggested HTTP status for controllers */
    httpStatus?: number;
    /** Root-cause + fix guidance for developers */
    developerHint?: string;
    /** Parsed table / column / value when available */
    meta?: ErrorMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SHARED HELPERS (precompiled regexes, memoized formatting)
// ─────────────────────────────────────────────────────────────────────────────

const W = ErrorSeverity.Warning;
const C = ErrorSeverity.Critical;

const RE = {
    duplicate: /Duplicate entry '([\s\S]*?)' for key '([^']+)'/i,
    nullColumn: /Column '([^']+)' cannot be null/i,
    noDefault: /Field '([^']+)' doesn't have a default value/i,
    tooLong: /Data too long for column '([^']+)'/i,
    badValue: /Incorrect \w+ value: '([\s\S]*?)' for column '([^']+)'/i,
    outOfRange: /Out of range value for column '([^']+)'/i,
    fkChild: /constraint fails \(`[^`]+`\.`([^`]+)`/i,
    fkInsert: /FOREIGN KEY\s+\(`([^`]+)`\)\s+REFERENCES\s+`([^`]+)`/i,
    noTable: /Table '([^']+)' doesn't exist/i,
    noColumn: /Unknown column '([^']+)'/i,
} as const;

const uiNameCache = new Map<string, string>();

/** "quatation_additional_charges" -> "Quatation Additional Charges" (memoized) */
function uiName(dbName: string): string {
    if (!dbName) return "Field";
    let v = uiNameCache.get(dbName);
    if (v === undefined) {
        v = dbName.replace(/[_-]+/g, " ").trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        if (uiNameCache.size >= 500) uiNameCache.clear();
        uiNameCache.set(dbName, v);
    }
    return v;
}

/** "tbl.uq_email" -> table "tbl", index "uq_email" ; "PRIMARY" -> table undefined */
function splitKey(keyRaw: string): { table?: string; index: string } {
    const dot = keyRaw.lastIndexOf(".");
    return dot > -1 ? { table: keyRaw.slice(0, dot), index: keyRaw.slice(dot + 1) } : { index: keyRaw };
}

const stripIndexAffixes = (idx: string) => idx.replace(/^(uq|uk|unique|idx|ix)_/i, "").replace(/_(uq|uk|unique|idx|ix)$/i, "");

// ─────────────────────────────────────────────────────────────────────────────
// 3. DATABASE RULE TABLE
// ─────────────────────────────────────────────────────────────────────────────

interface Built { message: string; hint?: string; meta?: ErrorMeta }
type Builder = (raw: string) => Built;
interface DbRule { type: string; severity: ErrorSeverity; status: number; build: Builder }

/** Rule factory: `build` may be a fixed string or a function of the raw driver message. */
const rule = (type: string, severity: ErrorSeverity, status: number, build: Builder | string, hint?: string): DbRule => ({
    type, severity, status,
    build: typeof build === "string" ? () => ({ message: build, hint }) : build,
});

/** Regex-driven builder with a safe fallback when the driver message format differs. */
const fromMatch = (re: RegExp, ok: (m: RegExpExecArray) => Built, fallback: string): Builder => (raw) => {
    const m = re.exec(raw);
    return m ? ok(m) : { message: fallback };
};

const buildDuplicate: Builder = fromMatch(
    RE.duplicate,
    (m) => {
        const value = m[1];
        const { table, index } = splitKey(m[2]);
        const tableUi = table ? uiName(table) : undefined;

        // ── PRIMARY KEY collision ──
        if (index.toLowerCase() === "primary") {
            return {
                message:
                    `A record with ID '${value}' already exists${tableUi ? ` in ${tableUi}` : ""}. ` +
                    `Please use a different ID. If you did not enter an ID yourself, refresh the page and try again, ` +
                    `or contact support if it keeps happening.`,
                hint:
                    `Duplicate PRIMARY KEY '${value}' on \`${table ?? "?"}\`. Likely causes: ` +
                    `(1) client sent an explicit id on create; ` +
                    `(2) AUTO_INCREMENT behind MAX(id) -> compare SELECT MAX(id) with AUTO_INCREMENT in information_schema.TABLES ` +
                    `and ALTER TABLE ... AUTO_INCREMENT = <max+1>; ` +
                    `(3) double-submit / retried insert (add idempotency or disable the button while saving); ` +
                    `(4) seed or import collision. Prefer server-generated ids or an upsert.`,
                meta: { table, column: "PRIMARY", value },
            };
        }

        // ── UNIQUE index collision ──
        const field = uiName(stripIndexAffixes(index));
        return {
            message: `'${value}' is already used for ${field}${tableUi ? ` in ${tableUi}` : ""}. Please use a different value.`,
            hint: `Duplicate value '${value}' violates UNIQUE index \`${index}\`${table ? ` on \`${table}\`` : ""}. ` +
                  `Check for an existing row first or use an upsert (INSERT ... ON DUPLICATE KEY UPDATE).`,
            meta: { table, column: index, value },
        };
    },
    "A record with this information already exists. Please use a different value.",
);

const DUP = rule("Duplicate Entry", W, 409, buildDuplicate);
const OFFLINE = rule("Database Offline", C, 503, "Unable to connect to the database server. Please try again shortly or contact support.",
    "DB unreachable: check host/port, network/firewall, server status, and pool settings.");

/** MySQL errno -> rule. Frozen, O(1) lookup. */
const DB_RULES: Readonly<Record<number, DbRule>> = Object.freeze({
    // Duplicates / uniqueness
    1062: DUP,
    1586: DUP,

    // Required / null
    1048: rule("Null Field", W, 400,
        fromMatch(RE.nullColumn, (m) => ({
            message: `'${uiName(m[1])}' is required and cannot be empty.`,
            hint: `Column \`${m[1]}\` is NOT NULL but received NULL. Check payload mapping and model allowNull.`,
            meta: { column: m[1] },
        }), "A required field was left blank. Please fill in all mandatory fields.")),
    1364: rule("Missing Default", W, 400,
        fromMatch(RE.noDefault, (m) => ({
            message: `'${uiName(m[1])}' must be provided.`,
            hint: `Column \`${m[1]}\` has no default and was omitted from the INSERT. Send a value or add a DEFAULT.`,
            meta: { column: m[1] },
        }), "A required field is missing a value.")),

    // Length / range / type
    1406: rule("Data Too Long", W, 400,
        fromMatch(RE.tooLong, (m) => ({
            message: `The value entered for '${uiName(m[1])}' is too long. Please shorten it.`,
            hint: `Value exceeds the length of column \`${m[1]}\`. Validate length before saving or widen the column.`,
            meta: { column: m[1] },
        }), "One of the values you entered exceeds the maximum allowed length.")),
    1264: rule("Out of Range", W, 400,
        fromMatch(RE.outOfRange, (m) => ({
            message: `The number entered for '${uiName(m[1])}' is outside the allowed range.`,
            hint: `Numeric overflow on column \`${m[1]}\`. Check column type (INT vs BIGINT / DECIMAL precision).`,
            meta: { column: m[1] },
        }), "One of the numbers entered is outside the allowed range. Please verify your input.")),
    1366: rule("Invalid Value", W, 400,
        fromMatch(RE.badValue, (m) => ({
            message: `'${m[1]}' is not a valid value for '${uiName(m[2])}'.`,
            hint: `Type mismatch on column \`${m[2]}\` (value '${m[1]}'). Validate/cast input before the query.`,
            meta: { column: m[2], value: m[1] },
        }), "One of the values entered has the wrong format. Please verify your input.")),

    // Foreign keys
    1451: rule("FK Constraint — Delete", W, 409,
        fromMatch(RE.fkChild, (m) => ({
            message: `This record cannot be deleted because it is still used in '${uiName(m[1])}'. Remove the linked records first.`,
            hint: `Child table \`${m[1]}\` still references this row. Delete children first, use ON DELETE CASCADE, or soft-delete.`,
            meta: { table: m[1] },
        }), "This record cannot be deleted because it is still referenced by other records.")),
    1452: rule("FK Constraint — Insert", W, 400,
        fromMatch(RE.fkInsert, (m) => ({
            message: `Invalid '${uiName(m[1])}'. The selected ${uiName(m[2])} does not exist. Please choose a valid option.`,
            hint: `\`${m[1]}\` points to a missing row in \`${m[2]}\`. Verify the id sent by the client exists.`,
            meta: { table: m[2], column: m[1] },
        }), "A referenced record does not exist. Please verify your selections.")),

    // Infrastructure
    1040: rule("Too Many Connections", C, 503, "The server is busy right now. Please retry in a moment.",
        "max_connections reached: check pool size, leaked connections (missing release), and slow queries."),
    1045: rule("Database Authentication Failed", C, 500, "A server configuration problem occurred. Please contact support.",
        "DB credentials rejected: check user/password in env and host grants."),
    2002: OFFLINE,
    2003: OFFLINE,
    2006: OFFLINE,
    2013: OFFLINE,

    // Concurrency
    1205: rule("Lock Timeout", W, 503, "The operation timed out due to concurrent activity. Please retry.",
        "Lock wait timeout: look for long-running transactions (SHOW ENGINE INNODB STATUS) and keep transactions short."),
    1213: rule("Deadlock Detected", W, 503, "A temporary conflict occurred and your request was cancelled. Please retry.",
        "Deadlock: acquire locks in a consistent order across code paths and retry the transaction."),

    // Developer / schema problems (hidden from users)
    1146: rule("Missing Table", C, 500,
        fromMatch(RE.noTable, (m) => ({
            message: "A system configuration problem occurred. Please contact support.",
            hint: `Table '${m[1]}' does not exist. Run migrations or verify the database/schema name.`,
            meta: { table: m[1] },
        }), "A system configuration problem occurred. Please contact support.")),
    1054: rule("Unknown Column", C, 500,
        fromMatch(RE.noColumn, (m) => ({
            message: "A system configuration problem occurred. Please contact support.",
            hint: `Unknown column '${m[1]}'. Model/query and table schema are out of sync (missing migration?).`,
            meta: { column: m[1] },
        }), "A system configuration problem occurred. Please contact support.")),
});

/** mysql2 / Node string codes -> MySQL errno (mysql2 often exposes only `code`). */
const CODE_BY_NAME: Readonly<Record<string, number>> = Object.freeze({
    ER_DUP_ENTRY: 1062, ER_DUP_UNIQUE: 1586,
    ER_BAD_NULL_ERROR: 1048, ER_NO_DEFAULT_FOR_FIELD: 1364,
    ER_DATA_TOO_LONG: 1406, ER_WARN_DATA_OUT_OF_RANGE: 1264, ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: 1366,
    ER_ROW_IS_REFERENCED_2: 1451, ER_NO_REFERENCED_ROW_2: 1452,
    ER_CON_COUNT_ERROR: 1040, ER_ACCESS_DENIED_ERROR: 1045,
    ER_LOCK_WAIT_TIMEOUT: 1205, ER_LOCK_DEADLOCK: 1213,
    ER_NO_SUCH_TABLE: 1146, ER_BAD_FIELD_ERROR: 1054,
    ECONNREFUSED: 2003, PROTOCOL_CONNECTION_LOST: 2013, ETIMEDOUT: 2013,
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. LOGGER
// ─────────────────────────────────────────────────────────────────────────────

export class MysqlAdvanceLogger {
    public static resolve(error: unknown): AppErrorResult {
        // Already normalized -> pass through
        if (error && typeof error === "object" && "errorSource" in error && "errorMessage" in error) {
            return error as AppErrorResult;
        }

        const now = new Date();

        if (error === null || error === undefined) {
            return this.unknown("Unknown Null Value", "An unidentified system error occurred. Please contact support.",
                "Null or undefined was thrown.", now);
        }
        if (typeof error !== "object") {
            return this.unknown("Primitive Throw", "An unexpected system anomaly occurred. Please try again.",
                `Primitive value thrown: ${String(error)}`, now);
        }
        if (this.isDatabaseError(error)) return this.resolveDatabaseError(error, now);

        if (error instanceof Error || typeof (error as any).message === "string") {
            return this.resolveNonDatabaseError(error as Error, now);
        }

        let details: string;
        try { details = JSON.stringify(error); } catch { details = "[unserializable object]"; }
        return this.unknown("Untyped Object", "An unexpected error occurred. Please contact support.", details, now);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static unknown(errorType: string, errorMessage: string, technicalDetails: string, timestamp: Date): AppErrorResult {
        return {
            errorSource: "COMPLETELY_UNKNOWN", errorType, errorMessage,
            severity: C, code: 0, timestamp, technicalDetails, httpStatus: 500,
        };
    }

    /**
     * Only positive errno values count as MySQL errors. Node system errors (ECONNREFUSED, ENOTFOUND)
     * carry NEGATIVE errno values and must not be mistaken for DB errors.
     */
    private static isDatabaseError(err: any): boolean {
        if (typeof err.name === "string" && err.name.startsWith("Sequelize")) return true;
        const d = err.parent ?? err.original ?? err;
        return (typeof d.errno === "number" && d.errno > 0) || Boolean(d.sqlState || d.sqlMessage || d.sql);
    }

    private static resolveCode(d: any): number {
        if (typeof d.errno === "number" && d.errno > 0) return d.errno;
        if (typeof d.code === "number") return d.code;
        return typeof d.code === "string" ? CODE_BY_NAME[d.code] ?? 0 : 0;
    }

    private static resolveDatabaseError(err: any, timestamp: Date): AppErrorResult {
        const driver = err.parent ?? err.original ?? err;
        const code = this.resolveCode(driver);
        const raw: string = driver.sqlMessage || driver.message || "";

        // Sequelize model validation (no MySQL errno)
        if (!code && Array.isArray(err.errors) && err.errors.length) {
            const first = err.errors[0];
            return {
                errorSource: "DATABASE", errorType: "Validation Error",
                errorMessage: first?.message || "Some of the entered values are not valid. Please review and try again.",
                severity: W, code: 0, timestamp, technicalDetails: raw, httpStatus: 400,
                developerHint: `Sequelize validation failed on '${first?.path ?? "?"}'. See err.errors for all fields.`,
                meta: { column: first?.path, value: first?.value != null ? String(first.value) : undefined },
            };
        }

        const r = DB_RULES[code];
        if (!r) {
            return {
                errorSource: "DATABASE", errorType: `Unhandled DB Error (${code || "Unknown"})`,
                errorMessage: `A database error occurred (Code: ${code || "Unknown"}). Please contact support.`,
                severity: C, code, timestamp, technicalDetails: raw, httpStatus: 500,
                developerHint: `No rule for MySQL errno ${code}. Add one to DB_RULES. Raw: ${raw}`,
            };
        }

        const built = r.build(raw);
        return {
            errorSource: "DATABASE", errorType: r.type, errorMessage: built.message,
            severity: r.severity, code, timestamp, technicalDetails: raw,
            httpStatus: r.status, developerHint: built.hint, meta: built.meta,
        };
    }

    private static resolveNonDatabaseError(err: Error, timestamp: Date): AppErrorResult {
        const errorType = err.name || "Error";
        let severity = W;
        let errorMessage = err.message || "An application error occurred.";

        switch (errorType) {
            case "TypeError":
            case "ReferenceError":
            case "SyntaxError":
                severity = C;
                errorMessage = "An internal processing error occurred. Please contact technical support.";
                break;
            case "RangeError":
                errorMessage = "Input or iteration range exceeded allowed system bounds.";
                break;
        }

        return {
            errorSource: "NON_DATABASE", errorType, errorMessage, severity, timestamp,
            code: (err as any).code ?? (err as any).response?.status,
            technicalDetails: err.stack || err.message,
            httpStatus: severity === C ? 500 : 400,
            developerHint: severity === C ? `${errorType}: ${err.message}` : undefined,
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONTROLLER HELPER
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedControllerError {
    statusCode: number;
    message: string;
    /** Only populated outside production */
    developerHint?: string;
    errorType?: string;
}

/**
 * Standardizes controller error responses.
 *  - Constraint/input problems -> 4xx (409 for duplicates / in-use records, 400 for bad input)
 *  - DB outages / lock issues  -> 503
 *  - Crashes / unknown         -> 500 with a generic message (details stay in logs)
 */
export const parseControllerError = (error: unknown): ParsedControllerError => {
    const r = MysqlAdvanceLogger.resolve(error);
    const statusCode = r.httpStatus ?? (r.severity === ErrorSeverity.Critical ? 500 : 400);

    // DB messages are already user-safe; non-DB 5xx must stay generic
    const exposeMessage = r.errorSource === "DATABASE" || statusCode < 500;
    const out: ParsedControllerError = {
        statusCode,
        message: exposeMessage
            ? r.errorMessage
            : (global as any).responseConst?.INTERNAL_SERVER_ERROR || "Internal Server Error",
    };

    if (process.env.NODE_ENV !== "production") {
        out.developerHint = r.developerHint;
        out.errorType = r.errorType;
    }
    return out;
};