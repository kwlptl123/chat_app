/**
 * 1. ARCHITECTURE OVERVIEW:
 * Implements strict payload validation for Auth endpoints using express-validator.
 * Rejects malformed requests at the router level before they reach the controller.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Field Definition: Declare expected fields (user_name, password) and constraints.
 * - Execution: Intercept the request, evaluate constraints, and aggregate errors.
 * - Rejection: If errors exist, immediately return HTTP 400 with the standard response wrapper.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - router.post("/login", loginValidation, AuthController.loginUser);
 */

import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import createResponse from "../../../utils/helper/response.js";
import responseCode from "../../../utils/constants/code/http.status.code.js";

export const loginValidation = [
  // 1. Matches the controller's exact destructuring: const { user_name, password } = req.body;
  body("user_name").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
  
  // 2. Type the middleware function strictly
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      // 3. Serialize errors using .array() to ensure they format correctly in the JSON response
      const customResponse = createResponse(
        responseCode.BAD_REQUEST,
        "Validation failed",
        errors.array(),
        true
      );
      return res.status(responseCode.BAD_REQUEST).json(customResponse);
    }
    
    // 4. Pass execution to the controller if validation succeeds
    next();
  },
];