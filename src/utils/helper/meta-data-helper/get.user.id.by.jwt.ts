/**
 * ARCHITECTURE OVERVIEW:
 * Secure utility to extract and verify the active user ID from an incoming HTTP request token. 
 * Designed to act as a fail-fast data extractor for service layer mutations.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Token Extraction: Safely parse headers (Bearer or x-access-token). Return `null` if no token exists.
 * 2. Cryptographic Verification: Verify the token against the system secret.
 * 3. Fail-Fast: Throw explicit, structured API error responses on signature/expiry failure to halt operations immediately.
 * 4. Payload Resolution: Return the strictly typed `user_id`.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Service Layer Metadata: `const userId = getUserIdByJwt(req);`
 */

import { Request } from "express";
import jwt from "jsonwebtoken"; // <-- FIXED: Default import only
import { secret } from "../../../config/auth/auth.config.js";
import createResponse from "../response.js";
import HTTP_STATUS_CODES from "../../constants/code/http.status.code.js";
import RESPONSE_CONSTANTS from "../../constants/response/response.constant.js";

// Define the expected shape of your token payload
interface AuthTokenPayload extends jwt.JwtPayload {
    user_id: number | string;
    id?: number | string; // Fallback to handle different token shapes if needed
}

/**
 * Extracts and verifies the user ID from the request headers.
 * @param req The Express Request object
 * @returns The user_id if valid, or null if no token is provided.
 * @throws Structured ApiErrorResponse if the token is present but invalid or expired.
 */
const getUserIdByJwt = (req: Request): number | string | null => {
    // 1. Support BOTH 'x-access-token' and standard 'Authorization: Bearer ...' formats
    let token = req.headers["x-access-token"] as string | undefined;
    
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7, authHeader.length);
        }
    }

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, secret) as AuthTokenPayload;
        return decoded.user_id || decoded.id || null;
    } catch (err) {
        // Secure by Default: We throw the pre-formatted createResponse object.
        // Your global error handler in server.ts can catch this and directly execute: 
        // res.status(err.statusCode).json(err);
        
        // FIXED: Using jwt.TokenExpiredError instead of the named import
        if (err instanceof jwt.TokenExpiredError) {
            throw createResponse(
                HTTP_STATUS_CODES.UNAUTHORIZED,
                RESPONSE_CONSTANTS.AUTH.JWT_EXPIRED || "Unauthorized! Access Token has expired.",
                null,
                true
            );
        }
        
        throw createResponse(
            HTTP_STATUS_CODES.UNAUTHORIZED,
            RESPONSE_CONSTANTS.AUTH.UNVERIFIED_TOKEN || "Unauthorized! Token is invalid.",
            null,
            true
        );
    }
};

export default getUserIdByJwt;