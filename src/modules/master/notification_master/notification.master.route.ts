/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the NotificationMaster domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/notification path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import NotificationMasterController from "./notification.master.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validateNotificationMasterIdParam, 
    validateCreateNotificationMaster, 
    validateUpdateNotificationMaster 
} from "./notification.master.validation.js";

const basePath = "/api/v1/notification";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreateNotificationMaster,
  NotificationMasterController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validateNotificationMasterIdParam, ...validateUpdateNotificationMaster],
  NotificationMasterController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validateNotificationMasterIdParam,
  NotificationMasterController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  NotificationMasterController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validateNotificationMasterIdParam,
  NotificationMasterController.getById
);

export default router;
