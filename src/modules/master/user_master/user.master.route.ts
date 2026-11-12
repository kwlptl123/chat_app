/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the UserMaster domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/user path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import UserMasterController from "./user.master.controller.js";
import ValidatorHelper from "../../../utils/helper/validator.helper.js"; // Ensure ValidatorHelper is imported
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validateUserMasterIdParam, 
    validateCreateUserMaster, 
    validateUpdateUserMaster 
} from "./user.master.validation.js";

const basePath = "/api/v1/user";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreateUserMaster,
  UserMasterController.create
);

router.get(
    `${basePath}/:userId/chats`,
    authenticate,
    ValidatorHelper.validate(ValidatorHelper.idParam("userId", "number")),
    UserMasterController.getUserChats
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validateUserMasterIdParam, ...validateUpdateUserMaster],
  UserMasterController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validateUserMasterIdParam,
  UserMasterController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  UserMasterController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validateUserMasterIdParam,
  UserMasterController.getById
);

export default router;
