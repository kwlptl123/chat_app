import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModuleMetadata } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your central DB index file
const DB_INDEX_PATH = path.join(__dirname, '../../modules/index.ts');

export async function injectModelIntoDb(meta: ModuleMetadata) {
    try {
        let content = await fs.readFile(DB_INDEX_PATH, 'utf-8');
        const baseName = meta.folderName.replace(/_/g, '.');
        const modelName = `${meta.entityName}Model`;
        const initializedName = `initialized${meta.entityName}Model`;

        // Check if already injected to prevent duplicates
        if (content.includes(`import ${modelName}`)) {
            console.log(`[DB Injector] ${modelName} already exists in DB context. Skipping.`);
            return;
        }

        // Dynamically build the import path supporting nested module groups
        const importPath = meta.moduleGroup 
            ? `./${meta.moduleGroup}/${meta.folderName}/${baseName}.model.js` 
            : `./${meta.folderName}/${baseName}.model.js`;

        // The exact strings to inject
        const importStr = `import ${modelName} from "${importPath}";\n// --- GENERATOR: IMPORTS ---`;
        const interfaceStr = `${modelName}: ReturnType<typeof ${modelName}>;\n    // --- GENERATOR: INTERFACES ---`;
        const initStr = `const ${initializedName} = ${modelName}(sequelize);\n// --- GENERATOR: INITS ---`;
        const exportStr = `${modelName}: ${initializedName},\n    // --- GENERATOR: EXPORTS ---`;

        // Replace the anchors with the new code + replace the anchor so it's ready for the next one
        content = content.replace('// --- GENERATOR: IMPORTS ---', importStr);
        content = content.replace('// --- GENERATOR: INTERFACES ---', interfaceStr);
        content = content.replace('// --- GENERATOR: INITS ---', initStr);
        content = content.replace('// --- GENERATOR: EXPORTS ---', exportStr);

        await fs.writeFile(DB_INDEX_PATH, content, 'utf-8');
        console.log(`✅ [DB Injector] Successfully injected ${modelName} into DB context.`);
    } catch (error: any) {
        console.error(`❌ [DB Injector] Failed to inject into DB context: ${error.message}`);
    }
}