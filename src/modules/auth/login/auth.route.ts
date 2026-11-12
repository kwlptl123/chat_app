/**
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the Authentication module. Maps HTTP methods and 
 * URI endpoints to their respective validation middlewares and controller actions.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Middleware First: Validation schemas execute before business logic.
 * - Verb Isolation: Uses POST for secure data submission and PUT for destructive updates.
 * - Closed Access: These routes are public (no JWT middleware), but strictly control access to the app.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - app.use("/", authRoutes);
 */

import express from "express";
import { loginValidation } from "./auth.validation.js";
import authController from "./auth.controller.js";

const router = express.Router();
const basePath = "/api/v1/login";

// 1. Standard Login with pre-flight payload validation
router.post(
  `${basePath}`,
  loginValidation, // INJECTED: Ensures the payload is valid before hitting the controller
  authController.loginUser
);

// 2. OTP Generation and Dispatch
router.post(
  `${basePath}/resetOtp`,
  authController.OtpForPasswordReset
);

// 3. OTP Verification
router.post(
  `${basePath}/recheckOtp`,
  authController.resetPasswordValidation
);

// 4. Reset Password via Email verification flow
router.post(
  `${basePath}/update/password`,
  authController.UpdatePasswordByEmailId
);

// 5. Force Update Password (Requires Old Password)
router.put(
  `${basePath}/reset/password`,
  authController.passwordResetUpdate
);

export default router;