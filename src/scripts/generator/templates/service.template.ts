import { ModuleMetadata } from '../types.js';

export function generateServiceTemplate(meta: ModuleMetadata): string {
    const baseName = meta.folderName.replace(/_/g, '.');

    return `import { Request, Response } from "express";
import { Transaction } from "sequelize";
import ${meta.entityName}DAL from "./${baseName}.data.layer.js";
import { ${meta.entityName}CreationAttributes, ${meta.entityName}Attributes } from "./${baseName}.model.js";

const ${meta.entityName}Service = {
    getAll: async (transaction?: Transaction) => {
        return await ${meta.entityName}DAL.getAllDataByView(transaction);
    },

    getById: async (id: ${meta.primaryKeyType}, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await ${meta.entityName}DAL.getDataByIdByView(id, transaction);
    },

    create: async (data: ${meta.entityName}CreationAttributes, transaction?: Transaction) => {
        return await ${meta.entityName}DAL.CreateData(data, transaction);
    },

    update: async (id: ${meta.primaryKeyType}, data: Partial<${meta.entityName}Attributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await ${meta.entityName}Service.getById(id, transaction);
        if (!existingRecord) throw new Error("${meta.entityName} not found");
        
        return await ${meta.entityName}DAL.UpdateData(id, data, transaction);
    },

    delete: async (id: ${meta.primaryKeyType}, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await ${meta.entityName}Service.getById(id, transaction);
        if (!existingRecord) throw new Error("${meta.entityName} not found");

        return await ${meta.entityName}DAL.deleteDataById(id, req, res, transaction);
    }
};

export default ${meta.entityName}Service;
`;
}