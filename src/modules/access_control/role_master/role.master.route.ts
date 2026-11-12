/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the RoleMaster domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/role path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import RoleMasterController from "./role.master.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validateRoleMasterIdParam, 
    validateCreateRoleMaster, 
    validateUpdateRoleMaster 
} from "./role.master.validation.js";

const basePath = "/api/v1/role";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreateRoleMaster,
  RoleMasterController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validateRoleMasterIdParam, ...validateUpdateRoleMaster],
  RoleMasterController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validateRoleMasterIdParam,
  RoleMasterController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  RoleMasterController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validateRoleMasterIdParam,
  RoleMasterController.getById
);

export default router;
