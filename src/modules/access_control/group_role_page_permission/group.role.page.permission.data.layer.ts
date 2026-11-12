import GroupRolePagePermissionModel, { GroupRolePagePermissionCreationAttributes, GroupRolePagePermissionAttributes } from "./group.role.page.permission.model.js";

import commonPath, { AppErrorResult, Request, Response,Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData,ViewFieldTableWise,MysqlAdvanceLogger,QueryTypes,Op} = commonPath;


const GroupRolePagePermissionDAL = {
    CreateData: async (data: GroupRolePagePermissionCreationAttributes, transaction?: Transaction) => {
        try {
            return await GroupRolePagePermissionModel(db.sequelize).create(data, { transaction });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    UpdateData: async (role_page_permission_id: number, data: Partial<GroupRolePagePermissionAttributes>, transaction?: Transaction) => {
        try {
            return await GroupRolePagePermissionModel(db.sequelize).update(data, { 
                where: { role_page_permission_id: role_page_permission_id as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.GROUP_ROLE_PAGE_PERMISSION_FIELDS} `, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (role_page_permission_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.GROUP_ROLE_PAGE_PERMISSION_FIELDS} WHERE role_page_permission_id =$role_page_permission_id`, 
                { 
                    bind: { role_page_permission_id: role_page_permission_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (role_page_permission_id: number, req: Request, res: Response, transaction?: Transaction) => {
        try {
            // FIXED: tokenData only expects the Request object
            const userId = tokenData(req); 
            const [deleted] = await GroupRolePagePermissionModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { role_page_permission_id: role_page_permission_id as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },getDataByRoleIdAndPageId: async (role_id: number, page_id: number) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.GROUP_ROLE_PAGE_PERMISSION_FIELDS} WHERE role_id = $role_id and page_id = $page_id`, 
                { 
                    bind: { role_id: role_id, page_id:page_id}, 
                    type: QueryTypes.SELECT,
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },getDataByRoleId: async (role_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.GROUP_ROLE_PAGE_PERMISSION_FIELDS} WHERE role_id =$role_id`, 
                { 
                    bind: { role_id: role_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result ?? [];
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    }
};

export default GroupRolePagePermissionDAL;
