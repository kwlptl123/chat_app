/**
 * 1. ARCHITECTURE OVERVIEW:
 * Secure File Retrieval Layer. Manages reading local files and converting them back to Base64 strings for API transmission, ensuring strict path boundaries.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Security Check: Block path traversal attempts ('..') to prevent reading unauthorized system files.
 * 2. Verification: Verify the file exists on the disk before attempting a read operation.
 * 3. IO Operations: Read the file buffer and encode it directly to a Base64 string.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - const b64 = await getBase64FromFile("profiles/2026-10-01_user_avatar.png");
 */

import fs from "fs/promises";
import path from "path";

// 1. Secure by Default: Centralize root to prevent arbitrary reads
const ROOT_DIR = path.join(process.cwd(), "src", "resources");

export default async function getBase64FromFile(relativePath: string): Promise<string | null> {
    // 2. Prevent Path Traversal on reads
    if (relativePath.includes("..")) {
        console.error("Security Violation: Path traversal attempts ('..') are not allowed.");
        return null;
    }

    try {
        const fullPath = path.join(ROOT_DIR, relativePath);
        
        // 3. No Magic: Explicitly check if file exists by attempting to access its stats first
        try {
            await fs.access(fullPath);
        } catch {
            console.error(`File does not exist at path: ${fullPath}`);
            return null;
        }

        // 4. Read file and convert to Base64
        const fileData = await fs.readFile(fullPath, { encoding: 'base64' });
        return fileData;

    } catch (error: any) {
        console.error('❌ Error reading file:', error.message);
        throw error;
    }
}


// // 2. Example: Retrieving the file later
// import getBase64FromFile from './utils/getBase64FromFile';

// // Pass the relative path stored in your database
// const fileData = await getBase64FromFile("document/2026-10-01_16-50-38_contract.pdf");