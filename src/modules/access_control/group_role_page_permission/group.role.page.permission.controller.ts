/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Controller layer for GroupRolePagePermission. 
 * Integrates dual-layer data access (JSON Cache -> Database Fallback) to optimize read speeds.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Request Validation: express-validator halts execution on bad payloads.
 * 2. Read Strategy: Attempt JSON cache read first; fallback to Service/DAL.
 * 3. Write Strategy: Update DB via Service -> Update Audit Trail -> Update JSON.
 * ============================================================================
 */

import { Request, response, Response } from "express";
import GroupRolePagePermissionService from "./group.role.page.permission.service.js";

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

const GroupRolePagePermissionController = {
    
    create: async (req: Request, res: Response) => {
        try {
            // Automatically inject created_by, created_at, and is_active
            const data = createUpdateMetadata(req.body, req, false);
            data.role_page_permission_id = null;

            const createResult = await GroupRolePagePermissionService.create(data);
            
            if (createResult) {
                const newId = (createResult as any).role_page_permission_id;
                const getDataById = await GroupRolePagePermissionService.getById(newId);
                // Smart Upsert: Let the cache system handle hydration and insertion internally
                await LocalJsonHelper.save("GroupRolePagePermission", getDataById, "role_page_permission_id", newId, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Record added successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "Error adding record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[GroupRolePagePermissionController.create] Error ---> ${error}`);
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

            const getOlderData = await GroupRolePagePermissionService.getById(id);
            const updatedRowsCount = await GroupRolePagePermissionService.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                const newData = await GroupRolePagePermissionService.getById(id);
                await AudittrailHelper("group_role_page_permission", id, getOlderData, newData, null, null, req);

                // Smart Upsert: Updates the specific JSON array index automatically
                await LocalJsonHelper.save("GroupRolePagePermission", newData, "role_page_permission_id", id, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[GroupRolePagePermissionController.update] Error ---> ${error}`);
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
            
            const deletedRowsCount = await GroupRolePagePermissionService.delete(id, req, res);
            const isDeleted = Array.isArray(deletedRowsCount) ? deletedRowsCount[0] > 0 : deletedRowsCount > 0;

            if (isDeleted) {
                // Safely remove the entry from memory and disk
                await LocalJsonHelper.deleteEntry("GroupRolePagePermission", "role_page_permission_id", id);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_DELETING_RECORD || "Record deleted successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_DELETING_RECORD || "Error deleting record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[GroupRolePagePermissionController.delete] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {
            const getAllByJson = await LocalJsonHelper.getAll("GroupRolePagePermission");
            if (getAllByJson && getAllByJson.length !== 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getAllByJson)
                );
            }

            const getAll = await GroupRolePagePermissionService.getAll();

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
            logger.error(`[GroupRolePagePermissionController.getAll] Error ---> ${error}`);
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

            const getJsonDataById = await LocalJsonHelper.getByKey("GroupRolePagePermission", "role_page_permission_id", id);
            if (getJsonDataById) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getJsonDataById)
                );
            }

            const getById = await GroupRolePagePermissionService.getById(id);

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
            logger.error(`[GroupRolePagePermissionController.getById] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },bulkCreateUpdateGroupRolePagePermission: async (req: Request, res: Response) => {
        // 1. Validate incoming HTTP request payload structure


        try {
            const data = req.body;
            let hasSavedData = false;

            // 2. Secure by Default: Guard against empty, missing, or malformed page lists
            if (Array.isArray(data.pageList) && data.pageList.length > 0) {
                
                // 3. Iterate sequentially to ensure accurate, race-condition-free audit trail processing per record
                for (const pageId of data.pageList) {
                    
                    // 4. Query the database to determine if the composite relationship already exists
                    const existingData = await GroupRolePagePermissionService.getDataByRoleIdAndPageId(data.role_id, pageId);
                    const existingRecord = existingData as any
                    // 5. Safely validate the existence of a valid primary key from the query result
                    if (existingRecord  && existingRecord?.role_page_permission_id) {
                        const targetId = existingRecord.role_page_permission_id;
                        
                        // 6. Fetch the unmodified record explicitly for the audit trail baseline
                        const oldRecord = await GroupRolePagePermissionService.getById(targetId);
                        
                        // 7. Generate update metadata (implicitly injects modified_by, modified_at via your standard helper)
                        const updatePayload = createUpdateMetadata({
                            role_id: data.role_id,
                            page_id: pageId,
                            permission: data.permission,
                            description: data.description,
                            ip_address: data.ip_address,
                            city_cordinates: data.city_cordinates
                        }, req, true) as any;

                        // 8. Execute the mutation via the domain service
                        const [updatedRowsCount] = await GroupRolePagePermissionService.update(targetId, updatePayload);
                        
                        if (updatedRowsCount > 0) {
                            hasSavedData = true;
                            
                            // 9. Fetch the newly hydrated record and trigger the compliance audit log
                            const newRecord = await GroupRolePagePermissionService.getById(targetId);
                            await AudittrailHelper("group_role_page_permission", targetId, oldRecord, newRecord, null, null, req, res);
                        }
                    } else {
                        // 10. Generate creation metadata (implicitly injects created_by, created_at, is_active: true)
                        const createPayload = createUpdateMetadata({
                            role_id: data.role_id,
                            page_id: pageId,
                            permission: data.permission,
                            description: data.description,
                            ip_address: data.ip_address,
                            city_cordinates: data.city_cordinates
                        }, req, false) as any;
                        
                        // 11. No Magic: Explicitly nullify the ID to prevent client-side ID injection
                        createPayload.role_page_permission_id = null;

                        // 12. Persist the new role-page relationship
                        const createResult = await GroupRolePagePermissionService.create(createPayload);
                        if (createResult) {
                            hasSavedData = true;
                        }
                    }
                }
            }

            // 13. CRITICAL BUG FIX: Evaluate overall operation success and respond to prevent hanging requests
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
            logger.error(`[GroupRolePagePermissionController.bulkCreateUpdate] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },getGroupRolePagePermissionByRoleId: async (req: Request, res: Response) => {
    try {
        // 1. Extract the target role identifier securely from route parameters (No Magic)
        const rawRoleId = req.params.id;

        const role_id = Number(rawRoleId);
        
        // 3. Secure by Default: Validate that the parsed ID is an actual mathematical number before querying the database
        if (isNaN(role_id)) {
            return res.status(responseCode.BAD_REQUEST).send(
                commonResponse(
                    responseCode.BAD_REQUEST, 
                    "Invalid Role ID. Expected a numeric value.", 
                    null, 
                    true
                )
            );
        }
        
        // 2. Execute retrieval query via the domain service layer
        const getData = await GroupRolePagePermissionService.getDataByRoleId(role_id);
        
        // 3. Evaluate the result set to ensure it contains at least one record safely
        if (getData && getData.length !== 0) {
            
            // 4. Return successful OK response encapsulating the retrieved payload
            return res.status(responseCode.OK).send(
                commonResponse(
                    responseCode.OK,
                    (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully",
                    getData
                )
            );
        } else {
            
            // 5. Explicitly handle empty data sets to provide a structured client fallback
            return res.status(responseCode.BAD_REQUEST).send(
                commonResponse(
                    responseCode.BAD_REQUEST,
                    (responseConst as any).DATA_NOT_FOUND || "Data not found",
                    null,
                    true
                )
            );
        }
    } catch (error: any) {
        // 6. Securely catch and log exceptions without leaking internal stack traces to the client
        logger.error(`[GroupRolePagePermissionController.getByRoleId] Error ---> ${error}`);
        const { statusCode, message } = parseControllerError(error);

        // Return using standard format
        return res.status(statusCode).send(
            commonResponse(statusCode, message, null, true)
        );
    }
},
};

export default GroupRolePagePermissionController;
