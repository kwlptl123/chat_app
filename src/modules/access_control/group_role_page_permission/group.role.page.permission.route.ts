/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the GroupRolePagePermission domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/group-role-page-permission path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import GroupRolePagePermissionController from "./group.role.page.permission.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validateGroupRolePagePermissionIdParam, 
    validateCreateGroupRolePagePermission, 
    validateUpdateGroupRolePagePermission,
    validateBulkCreateUpdateGroupRolePagePermission 
} from "./group.role.page.permission.validation.js";

const basePath = "/api/v1/group-role-page-permission";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreateGroupRolePagePermission,
  GroupRolePagePermissionController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validateGroupRolePagePermissionIdParam, ...validateUpdateGroupRolePagePermission],
  GroupRolePagePermissionController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validateGroupRolePagePermissionIdParam,
  GroupRolePagePermissionController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  GroupRolePagePermissionController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validateGroupRolePagePermissionIdParam,
  GroupRolePagePermissionController.getById
);

router.get(
    `${basePath}/getData/byRole/:id`,
    authenticate,
    validateGroupRolePagePermissionIdParam, 
    GroupRolePagePermissionController.getGroupRolePagePermissionByRoleId
);

router.put(
    `${basePath}/create/update`,
    authenticate,
    validateBulkCreateUpdateGroupRolePagePermission, 
    GroupRolePagePermissionController.bulkCreateUpdateGroupRolePagePermission
);

export default router;
