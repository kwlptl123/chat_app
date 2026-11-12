/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Controller layer for MenuMaster. 
 * Integrates dual-layer data access (JSON Cache -> Database Fallback) to optimize read speeds.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Request Validation: express-validator halts execution on bad payloads.
 * 2. Read Strategy: Attempt JSON cache read first; fallback to Service/DAL.
 * 3. Write Strategy: Update DB via Service -> Update Audit Trail -> Update JSON.
 * ============================================================================
 */

import { Request, Response } from "express";
import MenuMasterService from "./menu.master.service.js";

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

const MenuMasterController = {
    
    create: async (req: Request, res: Response) => {

        try {
            // Automatically inject created_by, created_at, and is_active
            const data = createUpdateMetadata(req.body, req, false);
            data.menu_id = null;

            const createResult = await MenuMasterService.create(data);
            
            if (createResult) {
                const newId = (createResult as any).menu_id;
                const getDataById = await MenuMasterService.getById(newId);
                // Smart Upsert: Let the cache system handle hydration and insertion internally
                await LocalJsonHelper.save("MenuMaster", getDataById, "menu_id", newId, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Record added successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "Error adding record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[MenuMasterController.create] Error ---> ${error}`);
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

            const getOlderData = await MenuMasterService.getById(id);
            const updatedRowsCount = await MenuMasterService.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                const newData = await MenuMasterService.getById(id);
                await AudittrailHelper("menu_master", id, getOlderData, newData, null, null, req);

                // Smart Upsert: Updates the specific JSON array index automatically
                await LocalJsonHelper.save("MenuMaster", newData, "menu_id", id, false);
                if (typeof LocalJsonHelper.deleteFile === 'function') {
                    await LocalJsonHelper.deleteFile("RoleMaster");
                }

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[MenuMasterController.update] Error ---> ${error}`);
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
            
            const deletedRowsCount = await MenuMasterService.delete(id, req, res);
            const isDeleted = Array.isArray(deletedRowsCount) ? deletedRowsCount[0] > 0 : deletedRowsCount > 0;

            if (isDeleted) {
                // Safely remove the entry from memory and disk
                await LocalJsonHelper.deleteEntry("MenuMaster", "menu_id", id);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_DELETING_RECORD || "Record deleted successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_DELETING_RECORD || "Error deleting record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[MenuMasterController.delete] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {
            const getAllByJson = await LocalJsonHelper.getAll("MenuMaster");
            if (getAllByJson && getAllByJson.length !== 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getAllByJson)
                );
            }

            const getAll = await MenuMasterService.getAll();

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
            logger.error(`[MenuMasterController.getAll] Error ---> ${error}`);
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

            const getJsonDataById = await LocalJsonHelper.getByKey("MenuMaster", "menu_id", id);
            if (getJsonDataById) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getJsonDataById)
                );
            }

            const getById = await MenuMasterService.getById(id);

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
            logger.error(`[MenuMasterController.getById] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    }
};

export default MenuMasterController;
