/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the Permission domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/permission path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import PermissionController from "./permission.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validatePermissionIdParam, 
    validateCreatePermission, 
    validateUpdatePermission 
} from "./permission.validation.js";

const basePath = "/api/v1/permission";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreatePermission,
  PermissionController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validatePermissionIdParam, ...validateUpdatePermission],
  PermissionController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validatePermissionIdParam,
  PermissionController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  PermissionController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validatePermissionIdParam,
  PermissionController.getById
);

export default router;
