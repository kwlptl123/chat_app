/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Safely parses, alphabetizes, and mutates global database constant files 
 * during code generation. Groups entities alphabetically with `// ----> A` headers.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Extraction: Isolates the target variable block securely.
 * 2. Brace-Counting Parser: Parses nested objects correctly without Regex splits.
 * 3. Injection & Sorting: Injects the new entry, sorts alphabetically, adds headers.
 * 4. Mutation: Rewrites ONLY the object body, preserving surrounding code.
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModuleMetadata } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CORE PARSER: Bulletproof AST-style brace counting (Ignores strings & comments)
// ─────────────────────────────────────────────────────────────────────────────
function findMatchingBraceIndex(str: string, startIndex: number): number {
    let braceCount = 0;
    let insideString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = startIndex; i < str.length; i++) {
        const char = str[i];
        const nextChar = str[i + 1];

        // Skip Comments
        if (inLineComment) {
            if (char === '\n') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (char === '*' && nextChar === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }

        // Skip Strings
        if (insideString) {
            if (char === stringChar && str[i - 1] !== '\\') insideString = false;
            continue;
        }

        // Enter Comments
        if (char === '/' && nextChar === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (char === '/' && nextChar === '*') {
            inBlockComment = true;
            i++;
            continue;
        }

        // Enter Strings
        if (char === '"' || char === "'" || char === '`') {
            insideString = true;
            stringChar = char;
            continue;
        }

        // Count Braces
        if (char === '{') braceCount++;
        else if (char === '}') {
            braceCount--;
            if (braceCount === 0) return i;
        }
    }
    return -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Sort & Group Single-Line Constants (VIEW_NAME, ViewFields)
// ─────────────────────────────────────────────────────────────────────────────
function rebuildSingleLineConstants(content: string, variableName: string, newKey: string, newVal: string, sortCleanRegex: RegExp) {
    const blockRegex = new RegExp(`(const\\s+${variableName}\\s*=\\s*\\{)([\\s\\S]*?)(\\}\\s*(?:as\\s+const)?\\s*;)`);
    const blockMatch = content.match(blockRegex);
    
    if (!blockMatch) return content;

    const prefix = blockMatch[1];
    let body = blockMatch[2];
    const suffix = blockMatch[3];

    body = body.replace(/\s*\/\/ ----> [A-Z]/g, '');
    const entries = new Map<string, string>();
    
    const entryRegex = /^\s*([A-Z0-9_]+):\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),?/gm;
    let match;
    while ((match = entryRegex.exec(body)) !== null) {
        entries.set(match[1], match[2]);
    }

    entries.set(newKey, newVal);

    const sortedKeys = Array.from(entries.keys()).sort((a, b) => {
        return a.replace(sortCleanRegex, '').localeCompare(b.replace(sortCleanRegex, ''));
    });

    let newBody = '\n';
    let currentLetter = '';

    for (const key of sortedKeys) {
        const letter = key.replace(sortCleanRegex, '').charAt(0).toUpperCase();
        if (letter !== currentLetter) {
            currentLetter = letter;
            newBody += `    // ----> ${currentLetter}\n`;
        }
        newBody += `    ${key}:${entries.get(key)},\n`;
    }

    return content.replace(blockRegex, `${prefix}${newBody}${suffix}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Sort & Group Multi-Line Constants (local.json map)
// ─────────────────────────────────────────────────────────────────────────────
function rebuildMultiLineConstants(content: string, variableName: string, newKey: string, newVal: string) {
    const startRegex = new RegExp(`(const\\s+${variableName}\\s*=\\s*)(\\{)`);
    const startMatch = content.match(startRegex);
    
    if (!startMatch) {
        console.error(`❌ Could not find const ${variableName} = {`);
        return content;
    }
    
    // 1. Isolate the exact boundaries of the parent object map using brace counting
    const blockStart = (startMatch.index || 0) + startMatch[1].length; // Index of outer '{'
    const blockEnd = findMatchingBraceIndex(content, blockStart);
    
    if (blockEnd === -1) {
        console.error(`❌ Unmatched braces found in ${variableName} declaration.`);
        return content;
    }
    
    const prefix = content.substring(0, blockStart + 1);
    const body = content.substring(blockStart + 1, blockEnd);
    const suffix = content.substring(blockEnd);
    
    // 2. Extract top-level keys securely
    const entries = new Map<string, string>();
    const keyRegex = /(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_]+))\s*:\s*\{/g;
    let searchStartIndex = 0;
    
    while (true) {
        keyRegex.lastIndex = searchStartIndex;
        const match = keyRegex.exec(body);
        if (!match) break;
        
        const keyName = match[1] || match[2] || match[3];
        const startOfObject = match.index + match[0].length - 1; // Index of inner '{'
        
        const endOfObject = findMatchingBraceIndex(body, startOfObject);
        
        if (endOfObject !== -1) {
            // Extract cleanly from { to }
            const val = body.substring(startOfObject, endOfObject + 1).trim();
            entries.set(keyName, val);
            searchStartIndex = endOfObject + 1; // Skip safely over nested objects like conditions: {}
        } else {
            console.error(`❌ Corrupted object formatting detected for ${keyName}`);
            break; 
        }
    }

    // 3. Inject new and sort
    entries.set(newKey, newVal.trim());
    const sortedKeys = Array.from(entries.keys()).sort();
    
    let newBody = '\n';
    let currentLetter = '';

    for (const key of sortedKeys) {
        const letter = key.charAt(0).toUpperCase();
        if (letter !== currentLetter) {
            currentLetter = letter;
            newBody += `\n    // ----> ${currentLetter}\n`;
        }
        // Appends the trailing comma safely
        newBody += `    "${key}": ${entries.get(key)},\n`;
    }

    return prefix + newBody + suffix;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function updateDatabaseConstants(meta: ModuleMetadata) {
    const viewNamesPath = path.resolve(process.cwd(), 'src/utils/db/view.names.constants.ts');
    const viewFieldsPath = path.resolve(process.cwd(), 'src/utils/db/view.fields.constants.ts');
    const localJsonMapPath = path.resolve(process.cwd(), 'src/utils/constants/id_constant/local.json.constant.ts');

    const upperName = meta.folderName.toUpperCase();
    const viewNameKey = `GET_ALL_${upperName}`;
    const viewFieldsKey = `${upperName}_FIELDS`;

    // 1. UPDATE & SORT: view.names.constants.ts
    if (fs.existsSync(viewNamesPath)) {
        const content = fs.readFileSync(viewNamesPath, 'utf-8');
        const updatedContent = rebuildSingleLineConstants(content, "VIEW_NAME", viewNameKey, `"${meta.viewName}"`, /^GET_ALL_/);
        fs.writeFileSync(viewNamesPath, updatedContent, 'utf-8');
        console.log(`  ├── 🔗 Updated & Sorted: VIEW_NAME.${viewNameKey}`);
    }

    // 2. UPDATE & SORT: view.fields.constants.ts
    if (fs.existsSync(viewFieldsPath)) {
        const content = fs.readFileSync(viewFieldsPath, 'utf-8');
        
        const columns = meta.viewFields.map(f => {
            const colName = typeof f === 'string' ? f : f.name;
            return colName.toLowerCase() === 'by' ? '\\`by\\`' : colName;
        }).join(', ');

        const updatedContent = rebuildSingleLineConstants(content, "ViewFieldTableWise", viewFieldsKey, `\`SELECT ${columns} FROM \${VIEW_NAME.${viewNameKey}}\``, /_FIELDS$/);
        fs.writeFileSync(viewFieldsPath, updatedContent, 'utf-8');
        console.log(`  ├── 🔗 Updated & Sorted: ViewFieldTableWise.${viewFieldsKey}`);
    }

    // 3. UPDATE & SORT: local.json.constant.ts (TABLE_VIEW_FOLDER_MAP)
    if (fs.existsSync(localJsonMapPath)) {
        const content = fs.readFileSync(localJsonMapPath, 'utf-8');
        
        const newMapValue = `{
        view_name: "${meta.viewName}",
        folder_name: "${meta.folderName}",
        json_file_name: "${meta.folderName}.json5",
        skipMemoryCache: ${!meta.useJsonCache},
        conditions: {}
    }`;

        const updatedContent = rebuildMultiLineConstants(content, "TABLE_VIEW_FOLDER_MAP", meta.entityName, newMapValue);
        fs.writeFileSync(localJsonMapPath, updatedContent, 'utf-8');
        console.log(`  ├── 🔗 Updated & Sorted: TABLE_VIEW_FOLDER_MAP["${meta.entityName}"]`);
    }
}