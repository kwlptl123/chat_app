/**
 * 1. ARCHITECTURE OVERVIEW:
 * Secure File Persistence Layer. Manages filesystem IO for saving Base64 encoded files, handling directory generation, automated safe-timestamping (Asia/Kolkata), sanitization, and path-traversal prevention.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Validate Input: Skip empty inputs or existing HTTP URLs.
 * 2. Security Check: Block path traversal attempts ('..') in filenames or folder paths.
 * 3. Sanitization: Strip Base64 metadata headers and generate an OS-safe, collision-free filename using IST.
 * 4. IO Operations: Recursively create missing directories and execute an atomic asynchronous write.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - const { relativePath } = await saveBase64ToFile(base64Data, "profiles", "user_avatar.png");
 */

import fs from "fs/promises";
import path from "path";

export interface SaveFileResult {
    fullPath: string | null;
    relativePath: string | null;
}

// 1. Secure by Default: Centralize root to prevent arbitrary writes
const ROOT_DIR = path.join(process.cwd(), "src", "resources");

// 2. Code-First Docs: Utility to generate a filesystem-safe timestamp based on IST (Asia/Kolkata)
function getCurrentIndianTime(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    };

    const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(now);
    const map: Record<string, string> = {};
    
    parts.forEach(({ type, value }) => { map[type] = value; });

    return `${map.year}-${map.month}-${map.day}_${map.hour}-${map.minute}-${map.second}`;
}

export default async function saveBase64ToFile(base64String: string | null | undefined, folderPath: string, originalFileName: string): Promise<SaveFileResult> {
    // 3. Return early if input is missing or is already a hosted URL
    if (!base64String || /^https?:\/\//i.test(base64String)) {
        return { fullPath: null, relativePath: null };
    }

    if (!folderPath || typeof folderPath !== "string") {
    throw new TypeError("Invalid argument: 'folderPath' is required and must be a string.");
    }

    const safeOriginalFileName = typeof originalFileName === "string" ? originalFileName.trim() : "";

    if (folderPath.includes("..") || safeOriginalFileName.includes("..")) {
        throw new Error("Security Violation: Path traversal attempts ('..') are not allowed.");
    }

    try {
        const targetDirectory = path.join(ROOT_DIR, folderPath);

        // 5. Ensure the target directory exists
        await fs.mkdir(targetDirectory, { recursive: true });

        const fileTimestamp = getCurrentIndianTime();
        const ext = path.extname(originalFileName || "").toLowerCase();
        const name = path.basename(originalFileName || "upload", ext);

        // 6. No Magic: Explicitly clean the filename to prevent OS file-system errors
        const cleanName = name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
        const sanitizedName = `${cleanName || "upload"}${ext}`;
        const finalFileName = `${fileTimestamp}_${sanitizedName}`;

        const fullPath = path.join(targetDirectory, finalFileName);
        const relativePath = path.posix.join(folderPath, finalFileName);

        // 7. Strip the data URL prefix if present (e.g., 'data:image/png;base64,')
        const base64Data = base64String.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        
        // 8. Write the file to disk atomically
        await fs.writeFile(fullPath, buffer);

        return {
            fullPath: fullPath,
            relativePath: relativePath
        };
    } catch (error: any) {
        console.log("error",error)
        console.error("❌ File Save Error:", error.message);
        throw error;
    }
}



// // 1. Example: Saving a file
// import saveBase64ToFile from './utils/saveBase64ToFile';

// const { relativePath, fullPath } = await saveBase64ToFile(
//     base64Data, 
//     "document",  // <-- This creates/targets your src\resources\document folder
//     "contract.pdf"
// );



// console.log(relativePath); 
// // Output: document/2026-10-01_16-50-38_contract.pdf (Save THIS to your database!)