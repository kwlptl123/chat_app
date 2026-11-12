/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 *    Route definitions for the ChatMaster domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 *    1. Endpoint Resolution: Mounts on clean /api/v1/chat path.
 *    2. Security: Applies JWT authentication barrier to all endpoints.
 *    3. Validation: Enforces express-validator schemas before reaching the controller.
 *    4. Route Order: Custom domain routes must precede standard /:id wildcard routes.
 * ============================================================================
 */

import express from "express";
import ChatMasterController from "./chat.master.controller.js";
import authenticate from "../../../middleware/auth/authJwt.js";
import { 
    validateChatMasterIdParam, 
    validateCreateChatMaster, 
    validateUpdateChatMaster,
    validateCreateDirectChat,
    validateChatIdParam,
    validateMessageIdParam,
    validateSendMessage,
    validateMarkMessageRead,
    validateUpdateLastSeen,
    validateEditMessage,
    validateDeleteMessage
} from "./chat.master.validation.js";

const basePath = "/api/v1/chat";
const router = express.Router();

// ============================================================================
// 1. CUSTOM CHAT DOMAIN ROUTES
// ============================================================================

// POST /api/v1/chat/create
router.post(
    `${basePath}/create`,
    authenticate,
    validateCreateDirectChat,
    ChatMasterController.createOrGetDirectChat
);

// POST /api/v1/chat/:chatId/message/send
router.post(
    `${basePath}/:chatId/message/send`,
    authenticate,
    [...validateChatIdParam, ...validateSendMessage],
    ChatMasterController.sendMessage
);

// GET /api/v1/chat/:chatId/messages?limit=50
router.get(
    `${basePath}/:chatId/messages`,
    authenticate,
    validateChatIdParam,
    ChatMasterController.getMessages
);

// POST /api/v1/chat/:chatId/message/:messageId/read
router.post(
    `${basePath}/:chatId/message/:messageId/read`,
    authenticate,
    [...validateMessageIdParam, ...validateMarkMessageRead],
    ChatMasterController.markMessageRead
);

// POST /api/v1/chat/:chatId/lastseen
router.post(
    `${basePath}/:chatId/lastseen`,
    authenticate,
    [...validateChatIdParam, ...validateUpdateLastSeen],
    ChatMasterController.updateLastSeen
);

// ============================================================================
// 2. STANDARD GENERIC CRUD ROUTES
// ============================================================================

router.post(
    `${basePath}`,
    authenticate,
    validateCreateChatMaster,
    ChatMasterController.create
);

router.put(
    `${basePath}/:id`,
    authenticate,
    [...validateChatMasterIdParam, ...validateUpdateChatMaster],
    ChatMasterController.update
);

router.delete(
    `${basePath}/:id`,
    authenticate,
    validateChatMasterIdParam,
    ChatMasterController.delete
);

router.get(
    `${basePath}`,
    authenticate,
    ChatMasterController.getAll
);

router.get(
    `${basePath}/:id`,
    authenticate,
    validateChatMasterIdParam,
    ChatMasterController.getById
);

// PUT /api/v1/chat/:chatId/message/:messageId
router.put(
    `${basePath}/:chatId/message/:messageId`,
    authenticate,
    [...validateMessageIdParam, ...validateEditMessage],
    ChatMasterController.editMessage
);

// DELETE /api/v1/chat/:chatId/message/:messageId
router.delete(
    `${basePath}/:chatId/message/:messageId`,
    authenticate,
    [...validateMessageIdParam, ...validateDeleteMessage],
    ChatMasterController.deleteMessage
);

export default router;