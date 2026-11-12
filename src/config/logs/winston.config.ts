/**
 * ARCHITECTURE OVERVIEW:
 * Enterprise-grade asynchronous logging system utilizing Winston. Implements automatic log rotation, comprehensive error catching (uncaught/unhandled), and strict sensitive data redaction to prevent credential leakage in plaintext logs.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Data Sanitization: Intercept and redact sensitive fields (passwords, tokens) before processing.
 * 2. Format Pipelines: Transform sanitized data into colorized text (Dev) or structured JSON (Prod).
 * 3. Transport Routing: Route formatted logs to specific file directories based on severity level.
 * 4. Instance Export: Export the singleton logger and a dedicated HTTP stream for Morgan middleware.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Standard Logging: `logger.info("Server started", { port: 3000 });`
 * 2. Error Logging: `logger.error("DB Failure", { error: err });` // Stack trace auto-extracted
 * 3. HTTP Stream: `app.use(morgan("dev", { stream: logStream }));`
 */

// 1. Import required modules and types explicitly
import winston, { Logger, format } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// 2. Define strict configuration interfaces to eliminate magic objects
interface RotateFileConfig {
    folder: string;
    filePrefix: string;
    level: string;
}

// 3. Environment and Path Initialization
const { combine, timestamp, printf, colorize, errors, json } = format;
const isProd: boolean = process.env.NODE_ENV === "production";

// Use process.cwd() as a native alternative to app-root-path to reduce dependencies
const LOG_ROOT: string = path.join(process.cwd(), "Backend-log");

// 4. Secure by Default: Intercept and mask sensitive data before it reaches the disk
const SENSITIVE_KEYS: Set<string> = new Set(["password", "token", "authorization", "secret", "cvv"]);

const redactSensitiveData = format((info) => {
    // Check if meta exists and is an object
    if (info.meta && typeof info.meta === "object") {
        // Explicitly cast to Record<string, any> so TypeScript allows dynamic key assignment
        const metaObj = info.meta as Record<string, any>;
        
        for (const key of Object.keys(metaObj)) {
            if (SENSITIVE_KEYS.has(key.toLowerCase())) {
                metaObj[key] = "[REDACTED]";
            }
        }
    }
    return info;
});

// 5. Shared Formats: Construct isolated pipelines for Files and Console
const fileFormat = combine(
    timestamp(),
    errors({ stack: true }), // Automatically pull stack traces from Error objects
    redactSensitiveData(),   // Apply redaction before serialization
    printf(({ level, message, timestamp, stack, ...meta }) => {
        return JSON.stringify({
            level,
            timestamp,
            message: stack || message, // Favor stack trace if an Error was passed
            ...(Object.keys(meta).length ? { meta } : {}),
        });
    })
);

const consoleFormat = combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack }) => {
        return `[${timestamp}] ${level}: ${stack || message}`;
    })
);

// 6. Transport Factory: Generates daily rotating file configurations systematically
function createRotateFileTransport({ folder, filePrefix, level }: RotateFileConfig): DailyRotateFile {
    return new DailyRotateFile({
        level,
        filename: `${filePrefix}-%DATE%.log`,
        datePattern: "DD-MM-YYYY",
        dirname: path.join(LOG_ROOT, folder),
        zippedArchive: true,  // Compress old logs to save disk space
        maxSize: "50m",       // Rotate file if it exceeds 50MB in a single day
        maxFiles: "30d",      // Retain logs for exactly 30 days
        auditFile: path.join(LOG_ROOT, folder, `${filePrefix}-audit.json`),
        format: fileFormat,
    });
}

// 7. Initialize default file transports based on severity routing
const transports: winston.transport[] = [
    createRotateFileTransport({ folder: "error", filePrefix: "error", level: "error" }),
    createRotateFileTransport({ folder: "info", filePrefix: "info", level: "info" }),
    createRotateFileTransport({ folder: "combined", filePrefix: "combined", level: "debug" }),
];

// 8. Inject console transport strictly for non-production environments
if (!isProd) {
    transports.push(
        new winston.transports.Console({
            level: "debug",
            format: consoleFormat,
        })
    );
}

// 9. Instantiate the Logger with explicit type declarations
const logger: Logger = winston.createLogger({
    level: isProd ? "info" : "debug",
    format: fileFormat,
    transports,
    exitOnError: false, // Prevent server crashes from non-fatal logging exceptions

    // Route catastrophic application failures to dedicated error logs
    exceptionHandlers: [
        createRotateFileTransport({ folder: "error", filePrefix: "exceptions", level: "error" }),
    ],
    rejectionHandlers: [
        createRotateFileTransport({ folder: "error", filePrefix: "rejections", level: "error" }),
    ],
});

// 10. Export a strictly typed stream wrapper for Morgan middleware compatibility
// (We export this separately instead of mutating the logger instance to appease TypeScript)
export const logStream = {
    write: (message: string): void => {
        logger.info(message.trim());
    },
};

export default logger;