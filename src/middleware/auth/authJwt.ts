/**
 * ARCHITECTURE OVERVIEW:
 * JWT-based authentication middleware. Intercepts incoming HTTP requests to validate cryptographic access tokens before granting access to protected routes.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Token Extraction: Retrieve token from 'Authorization: Bearer' or 'x-access-token' headers.
 * 2. Pre-Validation: Reject the request immediately with 401 if the token is missing.
 * 3. Cryptographic Verification: Verify the token signature using the centralized secret.
 * 4. Expiration Handling: Detect expired tokens and trigger specific refresh responses.
 * 5. Context Injection: Attach the decoded user ID to the Request object for downstream controllers.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"; // <-- FIXED: Default import only for ESM compatibility
import { secret } from "../../config/auth/auth.config.js";

import HTTP_STATUS_CODES from "../../utils/constants/code/http.status.code.js";
import RESPONSE_CONSTANTS from "../../utils/constants/response/response.constant.js";
import createResponse from "../../utils/helper/response.js";

// No Magic: Explicitly augment the global Express Request interface 
declare global {
    namespace Express {
        interface Request {
            userId?: string | number;
        }
    }
}

// Define the exact shape expected inside the JWT payload
interface JwtAuthPayload extends jwt.JwtPayload {
    id: string | number;
}

// FIXED: Exported as 'authJwt' to match your generator's route templates
const authJwt = (req: Request, res: Response, next: NextFunction): Response | void => {
    
    // 1. Support BOTH 'x-access-token' and standard 'Authorization: Bearer ...' formats
    let token = req.headers["x-access-token"] as string | undefined;
    
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7, authHeader.length);
        }
    }

    if (!token) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json(
            createResponse(
                HTTP_STATUS_CODES.UNAUTHORIZED,
                RESPONSE_CONSTANTS.AUTH.NO_TOKEN, 
                null,
                true
            )
        );
    }

    // 2. Verify the token signature (using jwt.VerifyErrors for strict ESM types)
    jwt.verify(token, secret, (err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
        if (err) {
            // 3. Gracefully handle expired sessions
            if (err instanceof jwt.TokenExpiredError) {
                return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json(
                    createResponse(
                        HTTP_STATUS_CODES.UNAUTHORIZED,
                        "Unauthorized! Access Token has expired.", 
                        null,
                        true
                    )
                );
            }

            return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json(
                createResponse(
                    HTTP_STATUS_CODES.UNAUTHORIZED,
                    RESPONSE_CONSTANTS.AUTH.UNAUTHORIZED, 
                    null,
                    true
                )
            );
        }

        if (!decoded) {
            return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json(
                createResponse(
                    HTTP_STATUS_CODES.UNAUTHORIZED,
                    RESPONSE_CONSTANTS.AUTH.UNAUTHORIZED, 
                    null,
                    true
                )
            );
        }

        // 4. Safely cast the decoded payload to our custom interface and inject it
        const payload = decoded as JwtAuthPayload;
        req.userId = payload.id;
        
        next();
    });
};


export default authJwt;