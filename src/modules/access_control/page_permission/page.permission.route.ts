/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the PagePermission domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/page-permission path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import PagePermissionController from "./page.permission.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validatePagePermissionIdParam, 
    validateCreatePagePermission, 
    validateUpdatePagePermission,
    validateBulkCreateOrUpdatePagePermission
} from "./page.permission.validation.js";

const basePath = "/api/v1/page-permission";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreatePagePermission,
  PagePermissionController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validatePagePermissionIdParam, ...validateUpdatePagePermission],
  PagePermissionController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validatePagePermissionIdParam,
  PagePermissionController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  PagePermissionController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validatePagePermissionIdParam,
  PagePermissionController.getById
);

router.put(
    `${basePath}/create/update`,
    authenticate,
    validateBulkCreateOrUpdatePagePermission,
    PagePermissionController.bulkCreateOrUpdatePagePermission
);

router.get(
    `${basePath}/getByPageId/AllPermission/:id`,
    authenticate,
    validatePagePermissionIdParam,
    PagePermissionController.getPermissionByPageId
);

export default router;
