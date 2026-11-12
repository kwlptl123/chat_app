/**
 * ARCHITECTURE OVERVIEW:
 * Secure cryptographic payload resolver utilizing AES-256-CBC.
 * Extracts the dynamic Initialization Vector (IV) from the payload prefix and decrypts the trailing ciphertext back into a JavaScript object.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Data Extraction: Split the incoming hex string into the 16-byte IV (first 32 characters) and the ciphertext (remainder).
 * 2. Cryptography: Reconstruct the AES-CBC decipher using the extracted IV and the system secret key.
 * 3. Deserialization: Parse the decrypted JSON string back into a heavily typed or generic JavaScript object.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Standard Decryption: 
 *    `const userData = decrypt<{ userId: number }>(req.body.reqBody);`
 */

import crypto from "crypto";

// 1. Fail-Fast: Validate the encryption key at module load time
const secretKeyHex = process.env.ENCRYPTION_SECRET_KEY;
if (!secretKeyHex || secretKeyHex.length !== 64) {
    throw new Error("FATAL ERROR: ENCRYPTION_SECRET_KEY must be exactly 64 hex characters (32 bytes).");
}
const SECRET_KEY = Buffer.from(secretKeyHex, "hex");
const IV_LENGTH = 16;
const HEX_IV_LENGTH = IV_LENGTH * 2; // 32 characters in hex

/**
 * Decrypts a hex string formatted as (IV + Ciphertext) into a parsed object.
 * @param encryptedText The complete hex string from the client
 * @returns The parsed JSON object, strictly typed if a generic <T> is provided
 */
export default function decrypt<T = any>(encryptedText: string): T {
    try {
        if (!encryptedText || encryptedText.length <= HEX_IV_LENGTH) {
            throw new Error("Invalid encrypted payload length.");
        }

        // 2. Extract the IV from the first 32 hex characters
        const IV = Buffer.from(encryptedText.substring(0, HEX_IV_LENGTH), "hex");

        // 3. Extract the actual ciphertext
        const encryptedData = encryptedText.substring(HEX_IV_LENGTH);

        // 4. Initialize the Decipher
        const decipher = crypto.createDecipheriv("aes-256-cbc", SECRET_KEY, IV);

        // 5. Decrypt from hex back to utf8 plaintext
        let decrypted = decipher.update(encryptedData, "hex", "utf8");
        decrypted += decipher.final("utf8");

        // 6. Parse and return the generic type
        return JSON.parse(decrypted) as T;
    } catch (error) {
        // Secure by Default: Mask decryption failures to prevent padding oracle attacks
        throw new Error("Decryption failed. Invalid payload or corrupted data.");
    }
}