/**
 * ARCHITECTURE OVERVIEW: 
 * Automated schema extraction utility that connects directly to the database via Sequelize, 
 * executes metadata queries, and outputs a formatted JSON configuration for manual review.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Configuration: Developer defines target table, view, and structural parameters.
 * 2. Connection Initialization: Establishes a temporary Sequelize session using existing config.
 * 3. Extraction: Executes a raw SQL query against information_schema to retrieve metadata.
 * 4. Transformation: Parses SQL output, explicitly sorting by database ordinal position.
 * 5. I/O & Teardown: Writes output to schema.json and safely terminates the connection.
 * 
 * IMPLEMENTATION EXAMPLES:
 * // 1. Update CONFIG_DECISIONS in this file, then extract:
 * // npm run schema:pull
 * 
 * // 2. Review the generated configuration:
 * // Open src/scripts/generator/schema.json
 */

import "dotenv/config"; // <-- Must be line 1

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';
import dbConfig, { DatabaseConfig } from "../../config/db/db.config.js";

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Explicitly define your architectural targets for the extraction
const CONFIG_DECISIONS = {
    // Scaffold Targets
    moduleGroup: "master",
    folderName: "notification_master",
    entityName: "NotificationMaster",
    useJsonCache: false,
    
    // Database Targets
    dbSchema: "chat_backend_db",
    tableName: "notification_master",
    viewName: "vw_user_notifications",
    
    outputFilePath: path.join(__dirname, 'schema.json')
};

// 2. Establish isolated database connection using existing configurations
const env = (process.env.NODE_ENV as keyof DatabaseConfig) || "development";
const config = dbConfig[env];

const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD || "", {
    host: config.HOST,
    dialect: config.DIALECT,
    logging: false // Disable logging to keep the terminal output clean
});

// 3. Define the pure transformation logic (Secure by default, no side-effects)
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

// 4. Orchestrate the extraction pipeline
async function pullSchema() {
    try {
        console.log(`\n🔌 Connecting to database [${config.DB}] at ${config.HOST}...`);
        
        // 4a. Execute the raw SQL extraction query, injecting the explicitly defined targets
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

        console.log(`📥 Extracting metadata for table [${CONFIG_DECISIONS.tableName}] & view [${CONFIG_DECISIONS.viewName}]...`);
        
        // 4b. Await raw results from the database
        const [results]: any = await sequelize.query(query);

        if (!results || results.length === 0 || !results[0].table_schema_json) {
            throw new Error(`Failed to extract data. Ensure table '${CONFIG_DECISIONS.tableName}' exists in schema '${CONFIG_DECISIONS.dbSchema}'.`);
        }

        // 4c. Transform SQL results into the ORM scaffolding template
        const { table_schema_json, view_schema_json } = results[0];
        const finalSchema = buildSchemaConfig(CONFIG_DECISIONS, table_schema_json, view_schema_json);

        // 4d. Write to file system for manual review
        fs.writeFileSync(CONFIG_DECISIONS.outputFilePath, JSON.stringify(finalSchema, null, 2));
        console.log(`✅ Schema successfully extracted and pending review at: ${CONFIG_DECISIONS.outputFilePath}\n`);

    } catch (error) {
        console.error("❌ Extraction failed:", error);
    } finally {
        // 4e. Require explicit action to close the connection and exit
        await sequelize.close();
    }
}

// 5. Trigger execution
pullSchema();