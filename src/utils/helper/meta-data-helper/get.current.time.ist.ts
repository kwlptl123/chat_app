/**
 * ARCHITECTURE OVERVIEW:
 * Standardized time generation utility. Ensures all database timestamps universally adhere to Indian Standard Time (IST) regardless of the server's physical or cloud region host timezone.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Timezone Enforcement: Bind the current execution time strictly to `Asia/Kolkata`.
 * 2. Format Standardization: Output as a SQL-compatible datetime string (`YYYY-MM-DD HH:mm:ss`).
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Database Insertion: `const createdAt = getCurrentIndianTime();`
 */

import moment from "moment-timezone";

/**
 * Generates the current timestamp in IST formatted for SQL datetime columns.
 * @returns string - Formatted timestamp (e.g., "2026-09-22 10:38:21")
 */
const getCurrentIndianTime = (): string => {
    return moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
};

export default getCurrentIndianTime;