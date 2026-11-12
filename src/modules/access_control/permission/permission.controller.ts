/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Controller layer for Permission. 
 * Integrates dual-layer data access (JSON Cache -> Database Fallback) to optimize read speeds.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Request Validation: express-validator halts execution on bad payloads.
 * 2. Read Strategy: Attempt JSON cache read first; fallback to Service/DAL.
 * 3. Write Strategy: Update DB via Service -> Update Audit Trail -> Update JSON.
 * ============================================================================
 */

import { Request, Response } from "express";
import PermissionService from "./permission.service.js";

// Centralized DI Facade
import commonPath from "../../../middleware/comman_path/comman.path.js";

// Extract strictly typed utilities from facade
const { 
    commonResponse, 
    responseCode, 
    responseConst, 
    logger,
    createUpdateMetadata,
    LocalJsonHelper,
    parseControllerError
} = commonPath;

import AudittrailHelper from "../../../utils/helper/audit.trail.helper.js";

const PermissionController = {
    
    create: async (req: Request, res: Response) => {

        try {
            // 2. Automatically inject created_by, created_at, and is_active (No magic metadata)
            const data = createUpdateMetadata(req.body, req, false);
            
            // 3. Explicitly nullify the ID to prevent client-side ID injection
            data.permission_id = null;

            // 4. Fetch the most recently added permission to determine the next bitwise value
            const getDataByIdLatest = await PermissionService.getPermissionLastestByDesc();
            
            // 5. Calculate the next permission value using powers of 2 for bitwise operations. Default to 1 if no records exist.
            const latestValue = getDataByIdLatest?.[0]?.dataValues?.permission_values;
            const nextPermissionValue = latestValue ? (latestValue * 2) : 1;
            
            // 6. Ensure the calculated value is strictly greater than 0
            data.permission_values = nextPermissionValue > 0 ? nextPermissionValue : 1;

            // 7. Persist the new permission entity
            const createResult = await PermissionService.create(data);
            
            if (createResult) {
                // 8. Extract the newly generated ID
                const newId = (createResult as any).permission_id;
                
                // 9. Fetch the hydrated record from the database to ensure state consistency
                const getDataById = await PermissionService.getById(newId);
                
                // 10. Smart Upsert: Persist the hydrated record into the local cache system
                await LocalJsonHelper.save("Permission", getDataById, "permission_id", newId, false);

                // 11. Return a successful HTTP 201 Created response
                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Record added successfully")
                );
            } else {
                // 12. Handle explicit logical failure to create
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "Error adding record", null, true)
                );
            }
        } catch (error: any) {
            // 13. Catch and log explicit exceptions securely without leaking internal stack traces
            logger.error(`[PermissionController.create] Error ---> ${error}`);
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
            
            // Automatically inject modified_by and modified_at
            const data = createUpdateMetadata(req.body, req, true);

            const getOlderData = await PermissionService.getById(id);
            const updatedRowsCount = await PermissionService.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                const newData = await PermissionService.getById(id);
                await AudittrailHelper("permission", id, getOlderData, newData, null, null, req);

                // Smart Upsert: Updates the specific JSON array index automatically
                await LocalJsonHelper.save("Permission", newData, "permission_id", id, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PermissionController.update] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const idParam = req.params.id as string;
            const id = parseInt(idParam, 10);
            
            const deletedRowsCount = await PermissionService.delete(id, req, res);
            const isDeleted = Array.isArray(deletedRowsCount) ? deletedRowsCount[0] > 0 : deletedRowsCount > 0;

            if (isDeleted) {
                // Safely remove the entry from memory and disk
                await LocalJsonHelper.deleteEntry("Permission", "permission_id", id);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_DELETING_RECORD || "Record deleted successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_DELETING_RECORD || "Error deleting record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PermissionController.delete] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {
            const getAllByJson = await LocalJsonHelper.getAll("Permission");
            if (getAllByJson && getAllByJson.length !== 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getAllByJson)
                );
            }

            const getAll = await PermissionService.getAll();

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
            logger.error(`[PermissionController.getAll] Error ---> ${error}`);
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

            const getJsonDataById = await LocalJsonHelper.getByKey("Permission", "permission_id", id);
            if (getJsonDataById) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getJsonDataById)
                );
            }

            const getById = await PermissionService.getById(id);

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
            logger.error(`[PermissionController.getById] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    }
};

export default PermissionController;
