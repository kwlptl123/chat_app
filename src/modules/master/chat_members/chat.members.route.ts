/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the ChatMembers domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/chat-members path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import ChatMembersController from "./chat.members.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validateChatMembersIdParam, 
    validateCreateChatMembers, 
    validateUpdateChatMembers 
} from "./chat.members.validation.js";

const basePath = "/api/v1/chat-members";
const router = express.Router();

router.post(
  `${basePath}`,
  authenticate,
  validateCreateChatMembers,
  ChatMembersController.create
);

router.put(
  `${basePath}/:id`,
  authenticate,
  [...validateChatMembersIdParam, ...validateUpdateChatMembers],
  ChatMembersController.update
);

router.delete(
  `${basePath}/:id`,
  authenticate,
  validateChatMembersIdParam,
  ChatMembersController.delete
);

router.get(
  `${basePath}`,
  authenticate,
  ChatMembersController.getAll
);

router.get(
  `${basePath}/:id`,
  authenticate,
  validateChatMembersIdParam,
  ChatMembersController.getById
);

export default router;
