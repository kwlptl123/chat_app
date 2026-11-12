/**
 * ARCHITECTURE OVERVIEW:
 * Centralized repository for Database Stored Procedure identifiers.
 * Isolates procedural execution logic from table/view querying logic.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Define standard Stored Procedure names used across the application.
 * 2. Apply `as const` to freeze values as strict string literals.
 * 3. Export as a standalone module to prevent cross-contamination with view definitions.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Execution: 
 *    `await sequelize.query(`CALL ${STORE_PROCEDURES.GET_RATE}(:param)`);`
 */

/**
 * ARCHITECTURE OVERVIEW:
 * Centralized repository for Database Stored Procedure identifiers.
 * Isolates procedural execution logic from table/view querying logic.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Define standard Stored Procedure names used across the application.
 * 2. Apply `as const` to freeze values as strict string literals.
 * 3. Export as a standalone module to prevent cross-contamination with view definitions.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Execution: 
 *    `await sequelize.query(\`CALL \${STORE_PROCEDURES.GET_RATE}(:param)\`);`
 */

const STORE_PROCEDURES = {
    GET_RATE: "GETRateForProformaInvoice",
    
} as const;

// Export as default so comman.path.ts can import it without curly braces
export default STORE_PROCEDURES;