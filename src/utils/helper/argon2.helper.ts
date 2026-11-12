/**
 * 1. ARCHITECTURE OVERVIEW:
 * Provides centralized cryptographic hashing and verification utilities using the Argon2 algorithm.
 * Abstracting the hashing library into a single module allows for easy algorithm tuning or replacement without widespread refactoring.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Secure Hashing: Relies on Argon2's internal secure defaults for automatic salt generation and cost factors.
 * - Validation: Validates incoming plain text against a stored hash, preventing timing attacks.
 * - Explicit Parameterization: Variable names explicitly define which parameter is hashed and which is plain text.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - const isMatch = await Argon2Helper.argon2Verify(plainTextPassword, storedHash);
 * - const newHash = await Argon2Helper.hashArgon(newPasswordString);
 */

import argon2 from 'argon2';

const Argon2Helper = {
    argon2Verify: async (plainText: string, hashedData: string): Promise<boolean> => {
        // 1. Utilize argon2.verify to safely compare the incoming plain text against the known hash.
        // The library automatically extracts the salt and algorithmic parameters directly from the hashed string.
        const isMatch = await argon2.verify(hashedData, plainText);
        
        // 2. Return a strict boolean result to dictate the authentication flow.
        return isMatch;
    },

    hashArgon: async (data: string): Promise<string> => {
        // 3. Generate a secure, randomized one-way hash using Argon2.
        // This natively handles salt generation and key stretching, ensuring secure-by-default behavior.
        const encryptedData = await argon2.hash(data);
        
        // 4. Return the fully computed hash string for database persistence.
        return encryptedData;
    }
};

export default Argon2Helper;