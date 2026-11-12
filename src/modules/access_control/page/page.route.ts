/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the Page domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/page path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import PageController from "./page.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validatePageIdParam, 
    validateCreatePage, 
    validateUpdatePage 
} from "./page.validation.js";

const basePath = "/api/v1/page";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreatePage,
  PageController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validatePageIdParam, ...validateUpdatePage],
  PageController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validatePageIdParam,
  PageController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  PageController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validatePageIdParam,
  PageController.getById
);

export default router;
