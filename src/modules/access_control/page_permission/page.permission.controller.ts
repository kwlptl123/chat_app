/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Controller layer for PagePermission. 
 * Integrates dual-layer data access (JSON Cache -> Database Fallback) to optimize read speeds.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Request Validation: express-validator halts execution on bad payloads.
 * 2. Read Strategy: Attempt JSON cache read first; fallback to Service/DAL.
 * 3. Write Strategy: Update DB via Service -> Update Audit Trail -> Update JSON.
 * ============================================================================
 */

import { Request, Response } from "express";
import PagePermissionService from "./page.permission.service.js";
import {PagePermissionAttributes} from "./page.permission.model.js"

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

const PagePermissionController = {
    
    create: async (req: Request, res: Response) => {

        try {
            // Automatically inject created_by, created_at, and is_active
            const data = createUpdateMetadata(req.body, req, false);
            data.page_permission_id = null;

            const createResult = await PagePermissionService.create(data);
            
            if (createResult) {
                const newId = (createResult as any).page_permission_id;
                const getDataById = await PagePermissionService.getById(newId);
                // Smart Upsert: Let the cache system handle hydration and insertion internally
                await LocalJsonHelper.save("PagePermission", getDataById, "page_permission_id", newId, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Record added successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "Error adding record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PagePermissionController.create] Error ---> ${error}`);
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

            const getOlderData = await PagePermissionService.getById(id);
            const updatedRowsCount = await PagePermissionService.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                const newData = await PagePermissionService.getById(id);
                await AudittrailHelper("page_permission", id, getOlderData, newData, null, null, req);

                // Smart Upsert: Updates the specific JSON array index automatically
                await LocalJsonHelper.save("PagePermission", newData, "page_permission_id", id, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PagePermissionController.update] Error ---> ${error}`);
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
            
            const deletedRowsCount = await PagePermissionService.delete(id, req, res);
            const isDeleted = Array.isArray(deletedRowsCount) ? deletedRowsCount[0] > 0 : deletedRowsCount > 0;

            if (isDeleted) {
                // Safely remove the entry from memory and disk
                await LocalJsonHelper.deleteEntry("PagePermission", "page_permission_id", id);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_DELETING_RECORD || "Record deleted successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_DELETING_RECORD || "Error deleting record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PagePermissionController.delete] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {
            const getAllByJson = await LocalJsonHelper.getAll("PagePermission");
            if (getAllByJson && getAllByJson.length !== 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getAllByJson)
                );
            }

            const getAll = await PagePermissionService.getAll();

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
            logger.error(`[PagePermissionController.getAll] Error ---> ${error}`);
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

            const getJsonDataById = await LocalJsonHelper.getByKey("PagePermission", "page_permission_id", id);
            if (getJsonDataById) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getJsonDataById)
                );
            }

            const getById = await PagePermissionService.getById(id);

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
            logger.error(`[PagePermissionController.getById] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },bulkCreateOrUpdatePagePermission: async (req: Request, res: Response) => {
        try {
            const { page_id, permissionIdList, ip_address, city_cordinates } = req.body;
            let hasSavedData = false;

            // 2. Secure by Default: Guard against empty or malformed permission lists
            if (Array.isArray(permissionIdList) && permissionIdList.length > 0) {
                
                // 3. Iterate sequentially to ensure accurate, race-condition-free audit trail processing
                for (const permissionId of permissionIdList) {
                    
                    // 4. TS Error 1005 Fix: Removed accidental colon `:` at the end of the statement
                    const existingData = await PagePermissionService.getByPageAndPermission(page_id, permissionId);
                    
                    if (existingData && existingData.length !== 0) {
                        // 5. TS Error 2339 Fix: Cast array element to bypass generic object type limitations
                        const targetRecord = existingData[0] as any; 
                        const targetId = targetRecord.page_permission_id;
                        
                        // 6. Fetch the unmodified record explicitly for the audit trail baseline
                        const oldRecord = await PagePermissionService.getById(targetId);
                        
                        // 7. TS Error 2345 Fix: Cast to `any` to reconcile nullable audit fields (like created_by) with strict Sequelize types
                        const updatePayload = createUpdateMetadata({
                            page_id,
                            permission_id: permissionId,
                            ip_address,
                            city_cordinates
                        }, req, true) as any;

                        // 8. Execute the mutation via the domain service
                        const updateResult = await PagePermissionService.update(targetId, updatePayload);
                        
                        if (updateResult) {
                            hasSavedData = true;
                            
                            // 9. Fetch the newly hydrated record and trigger the compliance audit log
                            const newRecord = await PagePermissionService.getById(targetId);
                            await AudittrailHelper("page_permission", targetId, oldRecord, newRecord, null, null, req, res);
                        }
                    } else {
                        // 10. TS Error 2345 & 2551 Fix: Cast to `any` to allow injection of custom properties and satisfy strict creation types
                        const createPayload = createUpdateMetadata({
                            page_id,
                            permission_id: permissionId,
                            ip_address,
                            city_cordinates
                        }, req, false) as any;
                        
                        // 11. No Magic: Explicitly nullify the ID to prevent client-side ID injection
                        createPayload.page_permission_id = null; 

                        // 12. Persist the new relationship
                        const createResult = await PagePermissionService.create(createPayload);
                        if (createResult) {
                            hasSavedData = true;
                        }
                    }
                }
            }

            // 13. Evaluate overall operation success and respond accordingly
            if (hasSavedData) {
                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Records processed successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "No records processed", null, true)
                );
            }

        } catch (error: any) {
            // 14. Securely catch and log exceptions without leaking internal stack traces to the client
            logger.error(`[PagePermissionController.bulkCreateOrUpdate] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getPermissionByPageId: async (req: Request, res: Response) => {
        try {
            // 1. Extract the target identifier securely from route parameters
            const page_id = req.params.id;
            
            // 2. Execute retrieval via the service layer
            // Note: Ensure `getByPageId` is implemented in your PagePermissionService
            const getData = await PagePermissionService.getByPageId(Number(page_id));
            
            // 3. Evaluate results and return strictly structured responses
            if (getData) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getData)
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).DATA_NOT_FOUND || "Data not found", null, true)
                );
            }
        } catch (error: any) {
            // 4. Secure exception handling
            logger.error(`[PagePermissionController.getPermissionByPageId] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    }
};

export default PagePermissionController;
