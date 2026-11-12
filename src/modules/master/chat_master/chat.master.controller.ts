/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 *    Controller layer for ChatMaster. 
 *    Handles standard generic CRUD via ChatMasterService and coordinates 
 *    complex domain logic (Firestore sync, relational notifications, transactions).
 *
 * 2. HIERARCHY & PRIORITY:
 *    1. Request Validation: express-validator halts execution on bad payloads.
 *    2. Relational Integrity: Verifies users/membership in MySQL via Sequelize.
 *    3. Firestore Sync & Notifications: Persists message in Firestore and inserts 
 *       unread alerts into `notification_master` for other chat participants.
 * ============================================================================
 */

import ChatMasterService from "./chat.master.service.js";
import AudittrailHelper from "../../../utils/helper/audit.trail.helper.js";

// Sequelize & Models for multi-table transactions (Directly accessed for domain logic)
import { Op } from "sequelize";

// Centralized DI Facade & Types
import commonPath, { Request, Response } from "../../../middleware/comman_path/comman.path.js";

// Extract strictly typed utilities from facade
const { 
    commonResponse, 
    responseCode, 
    responseConst, 
    logger,
    createUpdateMetadata,
    parseControllerError
} = commonPath;

const ChatMasterController = {
    
    // ------------------------------------------------------------------------
    // 1. STANDARD GENERIC CRUD OPERATIONS
    // ------------------------------------------------------------------------

    create: async (req: Request, res: Response) => {
        try {
            const data = createUpdateMetadata(req.body, req, false);
            data.chat_id = null;

            const createResult = await ChatMasterService.create(data);
            
            if (createResult) {
                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Record added successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "Error adding record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[ChatMasterController.create] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            const data = createUpdateMetadata(req.body, req, true);

            const getOlderData = await ChatMasterService.getById(id);
            const updatedRowsCount = await ChatMasterService.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                const newData = await ChatMasterService.getById(id);
                await AudittrailHelper("chat_master", id, getOlderData, newData, null, null, req);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[ChatMasterController.update] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            const deletedRowsCount = await ChatMasterService.delete(id, req, res);
            const isDeleted = Array.isArray(deletedRowsCount) ? deletedRowsCount[0] > 0 : deletedRowsCount > 0;

            if (isDeleted) {
                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_DELETING_RECORD || "Record deleted successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_DELETING_RECORD || "Error deleting record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[ChatMasterController.delete] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {
            const getAll = await ChatMasterService.getAll();
            if (getAll && getAll.length !== 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getAll)
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).DATA_NOT_FOUND || "Data not found", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[ChatMasterController.getAll] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getById: async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            const getById = await ChatMasterService.getById(id);
            if (getById) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getById)
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).DATA_NOT_FOUND || "Data not found", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[ChatMasterController.getById] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    // ------------------------------------------------------------------------
    // 2. CUSTOM CHAT DOMAIN OPERATIONS (Firebase + Transactions)
    // ------------------------------------------------------------------------

    createOrGetDirectChat: async (req: Request, res: Response) => {
        try {
            const userAId = Number(req.body.userAId);
            const userBId = Number(req.body.userBId);

            // Delegate to Service Layer (removes direct DB calls from Controller)
            const result = await ChatMasterService.createOrGetDirectChat(userAId, userBId);

            const status = result.created ? responseCode.CREATED : responseCode.OK;
            const message = result.created ? "Chat created successfully" : "Existing chat retrieved";

            return res.status(status).send(
                commonResponse(status, message, {
                    chatId: (result.chat as any).chat_id || (result.chat as any).getDataValue('chat_id'),
                    chatType: (result.chat as any).chat_type || (result.chat as any).getDataValue('chat_type'),
                    memberIds: result.memberIds,
                })
            );
        } catch (error: any) {
            logger.error(`[ChatMasterController.createOrGetDirectChat] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    },

    sendMessage: async (req: Request, res: Response) => {
        try {
            const chatId = Number(req.params.chatId);
            const senderId = Number(req.body.senderId);
            const text = String(req.body.text);

            // Delegate to Service Layer
            const savedMessage = await ChatMasterService.sendChatMessage(chatId, senderId, text);

            return res.status(responseCode.CREATED).send(
                commonResponse(responseCode.CREATED, "Message sent", savedMessage)
            );
        } catch (error: any) {
            console.log("error",error)
            logger.error(`[ChatMasterController.sendMessage] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            
            // Handle forbidden error specifically
            if (message === "Sender is not an active member of this chat.") {
                 return res.status(responseCode.FORBIDDEN).send(commonResponse(responseCode.FORBIDDEN, message, null, true));
            }
            
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    },

    getMessages: async (req: Request, res: Response) => {
        try {
            const chatId = Number(req.params.chatId);
            const limit = req.query.limit ? Number(req.query.limit) : 50;

            const messages = await ChatMasterService.getChatMessages(chatId, limit);
            
            return res.status(responseCode.OK).send(
                commonResponse(responseCode.OK, "Messages retrieved", messages)
            );
        } catch (error: any) {
            logger.error(`[ChatMasterController.getMessages] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    },

    markMessageRead: async (req: Request, res: Response) => {
        try {
            const chatId = Number(req.params.chatId);
            const messageId = String(req.params.messageId);
            const userId = Number(req.body.userId);

            await ChatMasterService.markMessageAsRead(chatId, messageId, userId);

            return res.status(responseCode.OK).send(
                commonResponse(responseCode.OK, "Message marked as read")
            );
        } catch (error: any) {
            logger.error(`[ChatMasterController.markMessageRead] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    },

    updateLastSeen: async (req: Request, res: Response) => {
        try {
            const chatId = Number(req.params.chatId);
            const userId = Number(req.body.userId);
            const messageId = String(req.body.messageId);

            await ChatMasterService.updateLastSeen(chatId, userId, messageId);
            
            return res.status(responseCode.OK).send(
                commonResponse(responseCode.OK, "Last seen updated", { chatId, userId, lastSeenMessageId: messageId })
            );
        } catch (error: any) {
            logger.error(`[ChatMasterController.updateLastSeen] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    },
    editMessage: async (req: Request, res: Response) => {
        try {
            const chatId = Number(req.params.chatId);
            const messageId = String(req.params.messageId);
            const senderId = Number(req.body.senderId);
            const text = String(req.body.text);

            await ChatMasterService.editChatMessage(chatId, messageId, senderId, text);

            return res.status(responseCode.OK).send(
                commonResponse(responseCode.OK, "Message updated successfully")
            );
        } catch (error: any) {
            logger.error(`[ChatMasterController.editMessage] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    },

    deleteMessage: async (req: Request, res: Response) => {
        try {
            const chatId = Number(req.params.chatId);
            const messageId = String(req.params.messageId);
            const senderId = Number(req.body.senderId);

            await ChatMasterService.deleteChatMessage(chatId, messageId, senderId);

            return res.status(responseCode.OK).send(
                commonResponse(responseCode.OK, "Message deleted successfully")
            );
        } catch (error: any) {
            logger.error(`[ChatMasterController.deleteMessage] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    }
};

export default ChatMasterController;