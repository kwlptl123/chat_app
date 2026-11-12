import { ModuleMetadata } from '../types.js';

export function generateDataLayerTemplate(meta: ModuleMetadata): string {
    const baseName = meta.folderName.replace(/_/g, '.');
    const constKey = `${meta.folderName.toUpperCase()}_FIELDS`;

    return `/*
 * ARCHITECTURE OVERVIEW: Data Access Layer (DAL) for ${meta.entityName} records. 
 * Database interactions are executed via Sequelize, and any resulting exceptions 
 * are intercepted, normalized by MysqlAdvanceLogger, and thrown as structured AppErrorResult objects.
 */
import ${meta.entityName}Model, { ${meta.entityName}CreationAttributes, ${meta.entityName}Attributes } from "./${baseName}.model.js";

import commonPath, { AppErrorResult, Request, Response, Transaction } from "${meta.relativeSrcPath}middleware/comman_path/comman.path.js";
const { db, tokenData, ViewFieldTableWise, MysqlAdvanceLogger, QueryTypes, Op } = commonPath;

const ${meta.entityName}DAL = {
    CreateData: async (data: ${meta.entityName}CreationAttributes, transaction?: Transaction) => {
        try {
            return await ${meta.entityName}Model(db.sequelize).create(data, { transaction });
        } catch (error) {
            // Intercept and structure the error
            const resolved: AppErrorResult = MysqlAdvanceLogger.resolve(error);
            throw resolved;
        }
    },

    UpdateData: async (${meta.primaryKey}: ${meta.primaryKeyType}, data: Partial<${meta.entityName}Attributes>, transaction?: Transaction) => {
        try {
            return await ${meta.entityName}Model(db.sequelize).update(data, { 
                where: { ${meta.primaryKey}: ${meta.primaryKey} as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                \`\${ViewFieldTableWise.${constKey}} \`, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (${meta.primaryKey}: ${meta.primaryKeyType}, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                \`\${ViewFieldTableWise.${constKey}} WHERE ${meta.primaryKey} =$${meta.primaryKey}\`, 
                { 
                    bind: { ${meta.primaryKey}: ${meta.primaryKey} }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (${meta.primaryKey}: ${meta.primaryKeyType}, req: Request, res: Response, transaction?: Transaction) => {
        try {
            const userId = tokenData(req); 
            const [deleted] = await ${meta.entityName}Model(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { ${meta.primaryKey}: ${meta.primaryKey} as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    }
};

export default ${meta.entityName}DAL;
`;
}