/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Controller layer for UserMaster. 
 * Direct database access mode (JSON Cache bypassed).
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Request Validation: express-validator halts execution on bad payloads.
 * 2. Read Strategy: Direct Database fetch via Service/DAL.
 * 3. Write Strategy: Update DB via Service -> Update Audit Trail.
 * ============================================================================
 */

import { Request, Response } from "express";
import UserMasterService from "./user.master.service.js";
import  sequelize  from "../../index.js";
import { QueryTypes } from "sequelize";
import ViewFieldTableWise from "../../../utils/db/view.fields.constants.js";

// Centralized DI Facade
import commonPath from "../../../middleware/comman_path/comman.path.js";
import { UserMasterAttributes } from "./user.master.model.js"; // INJECTED: Import your model attributes
import Argon2Helper from "../../../utils/helper/argon2.helper.js"; // INJECTED: Centralized crypto utility

// Extract strictly typed utilities from facade
const { 
    commonResponse, 
    responseCode, 
    responseConst, 
    logger,
    createUpdateMetadata,
    parseControllerError
} = commonPath;

import AudittrailHelper from "../../../utils/helper/audit.trail.helper.js";

const UserMasterController = {
    
    create: async (req: Request, res: Response) => {

        try {
            // 2. Strip user_id to prevent privilege escalation via payload injection
            const data = createUpdateMetadata(req.body, req, false);
            data.user_id = null;

            // 3. Delegate plaintext password transformation to the centralized secure hashing utility
            if (req.body.password) {
                try {
                    data.password = await Argon2Helper.hashArgon(req.body.password);
                    
                    // 4. Force a 90-day password rotation schedule from the creation date
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 90);
                    data.password_expiry_date = expiryDate;
                } catch (hashError) {
                    logger.error(`[UserMasterController.create] Error hashing password: ${hashError}`);
                    const { statusCode, message } = parseControllerError(hashError);

                    // Return using standard format
                    return res.status(statusCode).send(
                        commonResponse(statusCode, message, null, true)
                    );
                }
            }

            // 5. Commit the sanitized and hashed entity to the primary store
            const createResult = await UserMasterService.create(data);
            
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
            logger.error(`[UserMasterController.create] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    update: async (req: Request, res: Response) => {

        try {
            const idParam = req.params.id as string;
            const id = parseInt(idParam, 10);
            
            // 2. Hydrate the payload with authoritative modification timestamps and user IDs
            // Asserting as UserMasterAttributes (or Partial) allows safe dot-notation assignment below
            const data = createUpdateMetadata(req.body, req, true) as Partial<UserMasterAttributes>;

            // 3. Retrieve the current state to facilitate audit logging and password comparison
            // Typecast the return value to your Sequelize interface to expose the 'password' property
            const getOlderData = await UserMasterService.getById(id) as UserMasterAttributes;
            if (!getOlderData) {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, "Record not found", null, true)
                );
            }

            // 4. Resolve password state changes using the secure helper
            const newPassword = req.body.password;
            if (newPassword && !newPassword.startsWith('$argon2')) {
                // Now strictly typed: TypeScript knows 'password' exists on getOlderData
                const old_password = getOlderData.password;
                let isSamePassword = false;

                try {
                    // 5. Safely verify if the user is submitting their current password again.
                    isSamePassword = await Argon2Helper.argon2Verify(newPassword, old_password);
                } catch (verifyError) {
                    logger.error(`[UserMasterController.update] Error verifying password ---> ${verifyError}`);
                    isSamePassword = false; 
                }

                if (isSamePassword) {
                    // 6. Retain the existing hash if passwords match to minimize DB writes
                    data.password = old_password;
                } else {
                    // 7. Hash the new password via the helper and reset the 90-day expiry window
                    try {
                        data.password = await Argon2Helper.hashArgon(newPassword);
                        
                        const expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() + 90);
                        data.password_expiry_date = expiryDate;
                    } catch (hashError) {
                        logger.error(`[UserMasterController.update] Error hashing password: ${hashError}`);
                        const { statusCode, message } = parseControllerError(hashError);

                        // Return using standard format
                        return res.status(statusCode).send(
                            commonResponse(statusCode, message, null, true)
                        );
                    }
                }
            }

            // 8. Commit modifications to the primary store
            const updatedRowsCount = await UserMasterService.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                // 9. Record the state change sequentially to maintain a reliable audit trail
                const newData = await UserMasterService.getById(id);
                await AudittrailHelper("user_master", id, getOlderData, newData, null, null, req);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[UserMasterController.update] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    }
    ,

    delete: async (req: Request, res: Response) => {
        try {
            const idParam = req.params.id as string;
            const id = parseInt(idParam, 10);
            
            const deletedRowsCount = await UserMasterService.delete(id, req, res);
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
            logger.error(`[UserMasterController.delete] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {
            const getAll = await UserMasterService.getAll();

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
            logger.error(`[UserMasterController.getAll] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getById: async (req: Request, res: Response) => {
        try {
            const idParam = req.params.id as string;
            const id = parseInt(idParam, 10);

            const getById = await UserMasterService.getById(id);

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
            logger.error(`[UserMasterController.getById] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },
    getUserChats: async (req: Request, res: Response) => {
        try {
            const userId = parseInt(req.params.userId as string, 10);

            // FIX 1: Use `db.sequelize.query` instead of `sequelize.query`
            // and grab `QueryTypes` from `commonPath`
            const rows = await commonPath.db.sequelize.query(
                `${ViewFieldTableWise.USER_CHATS_SUMMARY_FIELDS} WHERE user_id = :userId ORDER BY chat_updated_at DESC`,
                {
                    replacements: { userId },
                    type: commonPath.QueryTypes.SELECT,
                }
            );

            // Sequelize raw SELECT queries return an array of rows.
            // Depending on the dialect, it might return [results, metadata]. 
            // We ensure we are working with an array.
            const resultData = Array.isArray(rows) ? rows : [];

            if (!resultData || resultData.length === 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, "No chats found for this user", [])
                );
            }

            // FIX 2: Explicitly type `row: any` in the map callback
            const formattedChats = resultData.map((row: any) => ({
                chatId: row.chat_id,
                chatType: row.chat_type,
                chatName: row.chat_name,
                myRole: row.member_role,
                totalMembers: row.total_members,
                memberIds: typeof row.member_ids_json === "string" ? JSON.parse(row.member_ids_json) : row.member_ids_json,
                createdAt: row.created_at,
                updatedAt: row.modified_at,
            }));

            return res.status(responseCode.OK).send(
                commonResponse(responseCode.OK, "Chats retrieved successfully", formattedChats)
            );
        } catch (error: any) {
            console.log("error",error)
            logger.error(`[UserMasterController.getUserChats] Error --->`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(commonResponse(statusCode, message, null, true));
        }
    }
};

export default UserMasterController;
