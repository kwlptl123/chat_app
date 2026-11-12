import PagePermissionModel, { PagePermissionCreationAttributes, PagePermissionAttributes } from "./page.permission.model.js";

import commonPath, { AppErrorResult, Request, Response,Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData,ViewFieldTableWise,MysqlAdvanceLogger,QueryTypes,Op} = commonPath;

const PagePermissionDAL = {
    CreateData: async (data: PagePermissionCreationAttributes, transaction?: Transaction) => {
        try {
            return await PagePermissionModel(db.sequelize).create(data, { transaction });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    UpdateData: async (page_permission_id: number, data: Partial<PagePermissionAttributes>, transaction?: Transaction) => {
        try {
            return await PagePermissionModel(db.sequelize).update(data, { 
                where: { page_permission_id: page_permission_id as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.PAGE_PERMISSION_FIELDS} `, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (page_permission_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.PAGE_PERMISSION_FIELDS} WHERE page_permission_id =$page_permission_id`, 
                { 
                    bind: { page_permission_id: page_permission_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (page_permission_id: number, req: Request, res: Response, transaction?: Transaction) => {
        try {
            // FIXED: tokenData only expects the Request object
            const userId = tokenData(req); 
            const [deleted] = await PagePermissionModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { page_permission_id: page_permission_id as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },getByPageId: async (page_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.PAGE_PERMISSION_FIELDS} WHERE page_id =$page_id`, 
                { 
                    bind: { page_id: page_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },getByPageAndPermission: async (page_id: number, permission_id: number) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.PAGE_PERMISSION_FIELDS} WHERE page_id = $page_id and permission_id = $permission_id`, 
                { 
                    bind: { page_id: page_id,
                        permission_id:permission_id
                     }, 
                    type: QueryTypes.SELECT,
                    
                }
            );
            return result ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },
};

export default PagePermissionDAL;
