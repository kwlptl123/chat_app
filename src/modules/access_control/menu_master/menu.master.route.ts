/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the MenuMaster domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/menu path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import MenuMasterController from "./menu.master.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validateMenuMasterIdParam, 
    validateCreateMenuMaster, 
    validateUpdateMenuMaster 
} from "./menu.master.validation.js";

const basePath = "/api/v1/menu";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreateMenuMaster,
  MenuMasterController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validateMenuMasterIdParam, ...validateUpdateMenuMaster],
  MenuMasterController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validateMenuMasterIdParam,
  MenuMasterController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  MenuMasterController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validateMenuMasterIdParam,
  MenuMasterController.getById
);

export default router;
