/**
 * ARCHITECTURE OVERVIEW:
 * Centralized configuration for authentication parameters. Validates the presence of critical cryptographic secrets at runtime to ensure the application starts in a secure state.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Read cryptographic secrets from the environment configuration.
 * 2. Validate existence: Throw a fatal application error immediately if critical variables are missing.
 * 3. Export typed, immutable constants for application-wide use.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. JWT Signing: `jwt.sign(payload, secret, { expiresIn: '1h' })`
 * 2. JWT Verification: `jwt.verify(token, secret)`
 */

// 1. Retrieve the secret, explicitly typing it as a string or undefined
const jwtSecret: string | undefined = process.env.JWT_SECRET;

// 2. Secure by Default: Fail fast if the secret is missing. 
// This prevents the application from silently running with an insecure or undefined secret.
if (!jwtSecret) {
    throw new Error("FATAL ERROR: JWT_SECRET environment variable is strictly required but not defined.");
}

// 3. Export the validated secret as a strongly-typed, immutable constant
export const secret: string = jwtSecret;