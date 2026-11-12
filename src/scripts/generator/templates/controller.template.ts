import { ModuleMetadata } from '../types.js';

export function generateControllerTemplate(meta: ModuleMetadata): string {
    const baseName = meta.folderName.replace(/_/g, '.');

    // Dynamically build structural blocks to keep the template perfectly clean
    const cacheDestructure = meta.useJsonCache ? ',\n    LocalJsonHelper' : '';

    return `/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Controller layer for ${meta.entityName}. 
 * ${meta.useJsonCache 
    ? 'Integrates dual-layer data access (JSON Cache -> Database Fallback) to optimize read speeds.' 
    : 'Direct database access mode (JSON Cache bypassed).'}
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Request Validation: express-validator halts execution on bad payloads.
 * 2. Read Strategy: ${meta.useJsonCache ? 'Attempt JSON cache read first; fallback to Service/DAL.' : 'Direct Database fetch via Service/DAL.'}
 * 3. Write Strategy: ${meta.useJsonCache ? 'Update DB via Service -> Update Audit Trail -> Update JSON.' : 'Update DB via Service -> Update Audit Trail.'}
 * ============================================================================
 */

import ${meta.entityName}Service from "./${baseName}.service.js";
import AudittrailHelper from "${meta.relativeSrcPath}utils/helper/audit.trail.helper.js";

// Centralized DI Facade & Types
import commonPath, { Request, Response } from "${meta.relativeSrcPath}middleware/comman_path/comman.path.js";

// Extract strictly typed utilities from facade
const { 
    commonResponse, 
    responseCode, 
    responseConst, 
    logger,
    createUpdateMetadata,
    parseControllerError${cacheDestructure}
} = commonPath;

const ${meta.entityName}Controller = {
    
    create: async (req: Request, res: Response) => {

        try {
            // Automatically inject created_by, created_at, and is_active
            const data = createUpdateMetadata(req.body, req, false);
            data.${meta.primaryKey} = null;

            const createResult = await ${meta.entityName}Service.create(data);
            
            if (createResult) {${meta.useJsonCache ? `
                const newId = (createResult as any).${meta.primaryKey};
                const getDataById = await ${meta.entityName}Service.getById(newId);
                // Smart Upsert: Let the cache system handle hydration and insertion internally
                await LocalJsonHelper.save("${meta.entityName}", getDataById, "${meta.primaryKey}", newId, false);
` : ''}
                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_ADDING_RECORD || "Record added successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_ADDING_RECORD || "Error adding record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(\`[${meta.entityName}Controller.create] Error --->\`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    update: async (req: Request, res: Response) => {

        try {
            const idParam = req.params.id as string;
            const id = ${meta.primaryKeyType === 'number' ? 'parseInt(idParam, 10)' : 'idParam'};
            
            // Automatically inject modified_by and modified_at
            const data = createUpdateMetadata(req.body, req, true);

            const getOlderData = await ${meta.entityName}Service.getById(id);
            const updatedRowsCount = await ${meta.entityName}Service.update(id, data);
            const isUpdated = Array.isArray(updatedRowsCount) ? updatedRowsCount[0] > 0 : updatedRowsCount > 0;

            if (isUpdated) {
                const newData = await ${meta.entityName}Service.getById(id);
                await AudittrailHelper("${meta.tableName}", id, getOlderData, newData, null, null, req);
${meta.useJsonCache ? `
                // Smart Upsert: Updates the specific JSON array index automatically
                await LocalJsonHelper.save("${meta.entityName}", newData, "${meta.primaryKey}", id, false);
` : ''}
                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_UPDATING_RECORD || "Record updated successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_UPDATING_RECORD || "Error updating record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(\`[${meta.entityName}Controller.update] Error --->\`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const idParam = req.params.id as string;
            const id = ${meta.primaryKeyType === 'number' ? 'parseInt(idParam, 10)' : 'idParam'};
            
            const deletedRowsCount = await ${meta.entityName}Service.delete(id, req, res);
            const isDeleted = Array.isArray(deletedRowsCount) ? deletedRowsCount[0] > 0 : deletedRowsCount > 0;

            if (isDeleted) {${meta.useJsonCache ? `
                // Safely remove the entry from memory and disk
                await LocalJsonHelper.deleteEntry("${meta.entityName}", "${meta.primaryKey}", id);
` : ''}
                return res.status(responseCode.CREATED).send(
                    commonResponse(responseCode.CREATED, (responseConst as any).SUCCESS_DELETING_RECORD || "Record deleted successfully")
                );
            } else {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, (responseConst as any).ERROR_DELETING_RECORD || "Error deleting record", null, true)
                );
            }
        } catch (error: any) {
            logger.error(\`[${meta.entityName}Controller.delete] Error --->\`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getAll: async (req: Request, res: Response) => {
        try {${meta.useJsonCache ? `
            const getAllByJson = await LocalJsonHelper.getAll("${meta.entityName}");
            if (getAllByJson && getAllByJson.length !== 0) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getAllByJson)
                );
            }
` : ''}
            const getAll = await ${meta.entityName}Service.getAll();

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
            logger.error(\`[${meta.entityName}Controller.getAll] Error --->\`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    },

    getById: async (req: Request, res: Response) => {
        try {
            const idParam = req.params.id as string;
            const id = ${meta.primaryKeyType === 'number' ? 'parseInt(idParam, 10)' : 'idParam'};
${meta.useJsonCache ? `
            const getJsonDataById = await LocalJsonHelper.getByKey("${meta.entityName}", "${meta.primaryKey}", id);
            if (getJsonDataById) {
                return res.status(responseCode.OK).send(
                    commonResponse(responseCode.OK, (responseConst as any).DATA_RETRIEVE_SUCCESS || "Data retrieved successfully", getJsonDataById)
                );
            }
` : ''}
            const getById = await ${meta.entityName}Service.getById(id);

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
            logger.error(\`[${meta.entityName}Controller.getById] Error --->\`, error);
            const { statusCode, message } = parseControllerError(error);
            return res.status(statusCode).send(
                commonResponse(statusCode, message, null, true)
            );
        }
    }
};

export default ${meta.entityName}Controller;
`;
}