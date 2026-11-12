/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Controller layer for Page. 
 * Integrates dual-layer data access (JSON Cache -> Database Fallback) to optimize read speeds.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Request Validation: express-validator halts execution on bad payloads.
 * 2. Read Strategy: Attempt JSON cache read first; fallback to Service/DAL.
 * 3. Write Strategy: Update DB via Service -> Update Audit Trail -> Update JSON.
 * ============================================================================
 */

import { Request, Response } from "express";
import PageService from "./page.service.js";

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

const PageController = {
    
    create: async (req: Request, res: Response) => {

        try {
            // Automatically inject created_by, created_at, and is_active
            const data = createUpdateMetadata(req.body, req, false);
            data.page_id = null;

            const createResult = await PageService.create(data);
            
            if (createResult) {
                const newId = (createResult as any).page_id;
                const getDataById = await PageService.getById(newId);
                // Smart Upsert: Let the cache system handle hydration and insertion internally
                await LocalJsonHelper.save("Page", getDataById, "page_id", newId, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Record added successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "Error adding record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PageController.create] Error ---> ${error}`);
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

            const getOlderData = await PageService.getById(id);
            const updatedRowsCount = await PageService.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                const newData = await PageService.getById(id);
                await AudittrailHelper("page", id, getOlderData, newData, null, null, req);

                // Smart Upsert: Updates the specific JSON array index automatically
                await LocalJsonHelper.save("Page", newData, "page_id", id, false);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PageController.update] Error ---> ${error}`);
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
            
            const deletedRowsCount = await PageService.delete(id, req, res);
            const isDeleted = Array.isArray(deletedRowsCount) ? deletedRowsCount[0] > 0 : deletedRowsCount > 0;

            if (isDeleted) {
                // Safely remove the entry from memory and disk
                await LocalJsonHelper.deleteEntry("Page", "page_id", id);

                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_DELETING_RECORD || "Record deleted successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_DELETING_RECORD || "Error deleting record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(`[PageController.delete] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {
            const getAllByJson = await LocalJsonHelper.getAll("Page");
            if (getAllByJson && getAllByJson.length !== 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getAllByJson)
                );
            }

            const getAll = await PageService.getAll();

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
            logger.error(`[PageController.getAll] Error ---> ${error}`);
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

            const getJsonDataById = await LocalJsonHelper.getByKey("Page", "page_id", id);
            if (getJsonDataById) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getJsonDataById)
                );
            }

            const getById = await PageService.getById(id);

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
            logger.error(`[PageController.getById] Error ---> ${error}`);
            const { statusCode, message } = parseControllerError(error);

            // Return using standard format
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    }
};

export default PageController;
