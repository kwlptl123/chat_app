/**
 * ARCHITECTURE OVERVIEW:
 * Secure cryptographic payload generator utilizing AES-256-CBC.
 * Automatically generates a cryptographically secure, randomized Initialization Vector (IV) for every execution to prevent pattern-matching attacks.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Environment Validation: Fail-fast if the encryption key is missing or incorrectly sized (must be exactly 32 bytes / 64 hex chars).
 * 2. Serialization: Convert the incoming dynamic data payload into a standardized JSON string.
 * 3. Cryptography: Generate a random 16-byte IV, create the cipher, and execute the AES-CBC encryption.
 * 4. Packaging: Prepend the plain-text IV (in hex) to the ciphertext so the decryptor can extract it later.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Encrypting a response: 
 *    `const encryptedPayload = encrypt({ userId: 1, role: 'admin' });`
 */

import crypto from "crypto";

// 1. Fail-Fast: Validate the encryption key at module load time, not runtime
const secretKeyHex = process.env.ENCRYPTION_SECRET_KEY;
if (!secretKeyHex || secretKeyHex.length !== 64) {
    throw new Error("FATAL ERROR: ENCRYPTION_SECRET_KEY must be exactly 64 hex characters (32 bytes).");
}
const SECRET_KEY = Buffer.from(secretKeyHex, "hex");

export interface EncryptedResponse {
    resBody: string;
}

/**
 * Encrypts arbitrary data into a hex string prepended with a random IV.
 * @param data The data object or array to encrypt
 * @returns EncryptedResponse object containing the IV + Ciphertext
 */
export default function encrypt(data: unknown): EncryptedResponse {
    try {
        // 2. Secure by Default: Generate a cryptographically strong random IV per request
        const IV = crypto.randomBytes(16);

        // 3. Initialize the Cipher
        const cipher = crypto.createCipheriv("aes-256-cbc", SECRET_KEY, IV);

        // 4. Serialize data
        const plaintext = JSON.stringify(data);

        // 5. Encrypt data to hex format
        let encrypted = cipher.update(plaintext, "utf8", "hex");
        encrypted += cipher.final("hex");

        // 6. Return the concatenated IV and Ciphertext
        return { resBody: IV.toString("hex") + encrypted };
    } catch (error) {
        // Secure by Default: Never log cryptographic failures to the console.
        // Throw a generic error to prevent leaking cipher state or payload shapes.
        throw new Error("Encryption failed during payload processing.");
    }
}