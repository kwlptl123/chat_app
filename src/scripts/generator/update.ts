/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * CLI orchestrator for automated model and validation synchronization. 
 * Reads TARGET constants, fetches live schema metadata directly from MySQL 
 * (bypassing schema.json), and safely overwrites ONLY the Model and Validation 
 * files to preserve custom business logic.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Configuration: Developer defines target table, view, and entity parameters.
 * 2. DB Query: Dynamically queries INFORMATION_SCHEMA via Sequelize.
 * 3. Transformation: Formats raw SQL output explicitly sorting by ordinal position.
 * 4. File Generation: Emits and overwrites ONLY the model and validation files.
 * 5. Constant Mutation: Updates database view queries.
 *
 * 3. IMPLEMENTATION EXAMPLES:
 * Update CONFIG_DECISIONS below and execute from terminal root:
 * npm run update:schema
 * ============================================================================
 */

import "dotenv/config"; // <-- CRITICAL: Must be line 1 to load DB credentials

import * as fs from 'fs';
import * as path from 'path';
import { parseRawSchema } from './sql.parser.js';
import { generateModelTemplate } from './templates/model.template.js';
import { generateValidationTemplate } from './templates/validation.template.js';
import { updateDatabaseConstants } from './constants.updater.js';
import commonPath from '../../middleware/comman_path/comman.path.js';

// ============================================================================
// 1. EXPLICITLY DEFINE ARCHITECTURAL TARGETS FOR UPDATE
// ============================================================================
const CONFIG_DECISIONS = {
    // Scaffold Targets
    moduleGroup: "master", // Leave empty if not in a sub-folder
    folderName: "country_master",
    entityName: "CountryMaster",
    useJsonCache: false,
    
    // Database Targets
    dbSchema: "chat",
    tableName: "country_master",
    viewName: "v_country_master"
};

// ============================================================================
// 2. PURE TRANSFORMATION LOGIC (Matches schema:pull formatting)
// ============================================================================
function buildSchemaConfig(decisions: typeof CONFIG_DECISIONS, tableJsonStr: string, viewJsonStr: string) {
    const tableData = typeof tableJsonStr === 'string' ? JSON.parse(tableJsonStr) : tableJsonStr;
    const viewData = typeof viewJsonStr === 'string' ? JSON.parse(viewJsonStr) : viewJsonStr;

    const systemFields = new Set(['created_by', 'created_at', 'modified_by', 'modified_at', 'deleted_by', 'deleted_at', 'is_active']);
    let primaryKey = '';
    const tableFields: Record<string, any> = {};
    const viewFields: Record<string, string> = {};

    // Sort table columns by ordinal position to maintain DB structure order
    tableData.columns
        .sort((a: any, b: any) => a.ordinal_position - b.ordinal_position)
        .forEach((col: any) => {
            const dataType = col.data_type.replace(' unsigned', ''); 
            
            const isPk = col.constraints && col.constraints.some((c: any) => c.constraint_type === 'PRIMARY KEY');
            if (isPk) primaryKey = col.column_name;

            if (isPk || systemFields.has(col.column_name)) {
                tableFields[col.column_name] = dataType;
            } else {
                const isNullable = col.is_nullable === 'YES';
                const fieldDef: Record<string, any> = { type: dataType, allowNull: isNullable };

                if (!isNullable) {
                    const humanReadable = col.column_name.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    fieldDef.message = `${humanReadable} is required.`;
                }
                tableFields[col.column_name] = fieldDef;
            }
        });

    if (viewData && viewData.columns) {
        // Sort view columns by ordinal position to maintain DB structure order
        viewData.columns
            .sort((a: any, b: any) => a.ordinal_position - b.ordinal_position)
            .forEach((col: any) => {
                viewFields[col.column_name] = col.data_type.replace(' unsigned', '');
            });
    }

    return Object.freeze({
        moduleGroup: decisions.moduleGroup,
        folderName: decisions.folderName,
        entityName: decisions.entityName,
        tableName: tableData.table_name,
        viewName: viewData.view_name,
        primaryKey,
        useJsonCache: decisions.useJsonCache,
        tableFields,
        viewFields
    });
}

// ============================================================================
// 3. ORCHESTRATE THE UPDATE PIPELINE
// ============================================================================
async function run() {
    console.log(`\n🔌 Fetching metadata from database for [${CONFIG_DECISIONS.tableName}]...`);
    const { db } = commonPath;
    
    // Execute the raw SQL extraction query, injecting the explicitly defined targets
    const query = `
        WITH table_constraints_agg AS (
            SELECT kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.COLUMN_NAME,
                JSON_ARRAYAGG(JSON_OBJECT('constraint_name', tc.CONSTRAINT_NAME, 'constraint_type', tc.CONSTRAINT_TYPE)) AS constraints
            FROM information_schema.TABLE_CONSTRAINTS tc
            JOIN information_schema.KEY_COLUMN_USAGE kcu
              ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
            WHERE tc.TABLE_SCHEMA = '${CONFIG_DECISIONS.dbSchema}' AND tc.TABLE_NAME = '${CONFIG_DECISIONS.tableName}'
            GROUP BY kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.COLUMN_NAME
        ),
        table_meta AS (
            SELECT JSON_OBJECT(
                'entity_type', 'TABLE', 'schema', '${CONFIG_DECISIONS.dbSchema}', 'table_name', '${CONFIG_DECISIONS.tableName}',
                'columns', JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'column_name', c.COLUMN_NAME, 'ordinal_position', c.ORDINAL_POSITION, 'data_type', c.COLUMN_TYPE,
                        'is_nullable', c.IS_NULLABLE, 'column_default', c.COLUMN_DEFAULT, 'column_key', c.COLUMN_KEY,
                        'extra', c.EXTRA, 'constraints', COALESCE(tca.constraints, JSON_ARRAY())
                    )
                )
            ) AS table_schema_json
            FROM information_schema.COLUMNS c
            LEFT JOIN table_constraints_agg tca ON c.TABLE_SCHEMA = tca.TABLE_SCHEMA AND c.TABLE_NAME = tca.TABLE_NAME AND c.COLUMN_NAME = tca.COLUMN_NAME
            WHERE c.TABLE_SCHEMA = '${CONFIG_DECISIONS.dbSchema}' AND c.TABLE_NAME = '${CONFIG_DECISIONS.tableName}'
        ),
        view_meta AS (
            SELECT JSON_OBJECT(
                'entity_type', 'VIEW', 'schema', '${CONFIG_DECISIONS.dbSchema}', 'view_name', '${CONFIG_DECISIONS.viewName}',
                'columns', JSON_ARRAYAGG(
                    JSON_OBJECT('column_name', c.COLUMN_NAME, 'ordinal_position', c.ORDINAL_POSITION, 'data_type', c.COLUMN_TYPE, 'is_nullable', c.IS_NULLABLE)
                )
            ) AS view_schema_json
            FROM information_schema.COLUMNS c
            WHERE c.TABLE_SCHEMA = '${CONFIG_DECISIONS.dbSchema}' AND c.TABLE_NAME = '${CONFIG_DECISIONS.viewName}'
        )
        SELECT tm.table_schema_json, vm.view_schema_json 
        FROM table_meta tm CROSS JOIN view_meta vm;
    `;

    const [results]: any = await db.sequelize.query(query);

    if (!results || results.length === 0 || !results[0].table_schema_json) {
        console.error(`❌ Failed to extract data. Ensure table '${CONFIG_DECISIONS.tableName}' exists in schema '${CONFIG_DECISIONS.dbSchema}'.`);
        process.exit(1);
    }

    // Transform SQL results into the intermediate format
    const { table_schema_json, view_schema_json } = results[0];
    const rawJson = buildSchemaConfig(CONFIG_DECISIONS, table_schema_json, view_schema_json);

    // Parse SQL metadata for generation
    const meta = parseRawSchema(rawJson as any);
    const baseName = meta.folderName.replace(/_/g, '.');

    // Resolve target module directory
    const moduleGroupPath = meta.moduleGroup ? meta.moduleGroup : '';
    const moduleDir = path.resolve(process.cwd(), 'src', 'modules', moduleGroupPath, meta.folderName);
    
    if (!fs.existsSync(moduleDir)) {
        console.error(`❌ Module directory not found: ${moduleDir}`);
        console.error(`Cannot update files for a module that hasn't been generated yet.`);
        process.exit(1);
    }

    // ============================================================================
    // STRICTLY TARGET MODEL AND VALIDATION ONLY
    // ============================================================================
    const files = [
        { name: `${baseName}.model.ts`, content: generateModelTemplate(meta) },
        { name: `${baseName}.validation.ts`, content: generateValidationTemplate(meta) }
    ];

    console.log(`\n🔄 Updating Model and Validation layers for [${meta.entityName}] in: ${moduleDir}\n`);

    // Overwrite ONLY the targeted files
    for (const file of files) {
        const fullPath = path.join(moduleDir, file.name);
        fs.writeFileSync(fullPath, file.content.trim() + '\n', 'utf-8');
        console.log(`  ├── ♻️ Updated: ${file.name}`);
    }

    // Update the global database view constant files (refreshes your ViewFieldTableWise)
    updateDatabaseConstants(meta);

    console.log(`\n✨ Update Complete!`);
    console.log(`🔒 Your custom Controller, Service, DAL, and Routes were safely preserved.`);

    // Force exit to cleanly terminate the DB connection pool
    process.exit(0);
}

// 4. Trigger execution
run().catch((error) => {
    console.error(`❌ Fatal update error:`, error);
    process.exit(1);
});