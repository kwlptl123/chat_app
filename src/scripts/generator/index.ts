/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * CLI orchestrator for automated code generation. Reads the global JSON schema,
 * parses SQL column types, executes all 6 layer templates, writes the files to disk, 
 * safely injects new database view queries into central registries, and binds 
 * the newly generated model into the central Sequelize database context.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Input Resolution: Locate and read the global schema.json.
 * 2. Schema Parsing: Convert raw SQL types into TS, Sequelize, and Validator metadata.
 * 3. Directory Provisioning: Ensure target domain module folder exists (supports nested groups).
 * 4. File Generation: Emit model, DAL, service, controller, route, and validation files.
 * 5. Constant Mutation: Inject SQL view definitions into global configuration files.
 * 6. Context Wiring: Automatically bind the model into src/modules/index.ts.
 *
 * 3. IMPLEMENTATION EXAMPLES:
 * Execute from terminal root:
 * npx tsx src/scripts/generator/index.ts
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { RawModuleSchema } from './types.js';
import { parseRawSchema } from './sql.parser.js';
import { generateModelTemplate } from './templates/model.template.js';
import { generateDataLayerTemplate } from './templates/data.layer.template.js';
import { generateServiceTemplate } from './templates/service.template.js';
import { generateControllerTemplate } from './templates/controller.template.js';
import { generateRouteTemplate } from './templates/route.template.js';
import { generateValidationTemplate } from './templates/validation.template.js';
import { updateDatabaseConstants } from './constants.updater.js';
import { injectModelIntoDb } from './db.injector.js';

async function run() {
    // 1. Locate the global schema.json inside the generator folder
    const schemaPath = path.resolve(process.cwd(), 'src', 'scripts', 'generator', 'schema.json');

    if (!fs.existsSync(schemaPath)) {
        console.error(`❌ Global schema file not found at: ${schemaPath}`);
        console.error(`Please create schema.json inside src/scripts/generator/`);
        process.exit(1);
    }

    // 2. Parse JSON and extract SQL metadata
    const rawJson: RawModuleSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const meta = parseRawSchema(rawJson);
    const baseName = meta.folderName.replace(/_/g, '.');

    // 3. Automatically resolve and create the target module directory (with sub-folder support)
    const moduleGroupPath = meta.moduleGroup ? meta.moduleGroup : '';
    const moduleDir = path.resolve(process.cwd(), 'src', 'modules', moduleGroupPath, meta.folderName);
    
    if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir, { recursive: true });
    }

    // 4. Build templates for all 6 architectural layers
    const files = [
        { name: `${baseName}.model.ts`, content: generateModelTemplate(meta) },
        { name: `${baseName}.data.layer.ts`, content: generateDataLayerTemplate(meta) },
        { name: `${baseName}.service.ts`, content: generateServiceTemplate(meta) },
        { name: `${baseName}.controller.ts`, content: generateControllerTemplate(meta) },
        { name: `${baseName}.route.ts`, content: generateRouteTemplate(meta) },
        { name: `${baseName}.validation.ts`, content: generateValidationTemplate(meta) },
    ];

    console.log(`\n🚀 Generating 6 layers for [${meta.entityName}] in: ${moduleDir}\n`);

    // 5. Write files to the module directory
    for (const file of files) {
        const fullPath = path.join(moduleDir, file.name);
        fs.writeFileSync(fullPath, file.content.trim() + '\n', 'utf-8');
        console.log(`  ├── 📄 Generated: ${file.name}`);
    }

    // 6. Update the global database view constant files
    updateDatabaseConstants(meta);

    // 7. Automatically wire the model into the central database context (src/modules/index.ts)
    await injectModelIntoDb(meta);

    console.log(`\n✨ Complete!`);
}

// 8. Execute the process
run().catch((error) => {
    console.error(`❌ Fatal generation error:`, error);
    process.exit(1);
});