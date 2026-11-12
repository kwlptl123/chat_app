import RoleMasterModel, { RoleMasterCreationAttributes, RoleMasterAttributes } from "./role.master.model.js";

import commonPath, { AppErrorResult, Request, Response,Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData,ViewFieldTableWise,MysqlAdvanceLogger,QueryTypes,Op} = commonPath;

const RoleMasterDAL = {
    CreateData: async (data: RoleMasterCreationAttributes) => {
        try {
            return await RoleMasterModel(db.sequelize).create(data);
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    UpdateData: async (role_id: number, data: Partial<RoleMasterAttributes>) => {
        try {
            return await RoleMasterModel(db.sequelize).update(data, { 
                where: { role_id: role_id as any } 
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async () => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.ROLE_MASTER_FIELDS} WHERE is_active = 1 AND deleted_at IS NULL`, 
                { type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (role_id: number) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.ROLE_MASTER_FIELDS} WHERE role_id =$role_id AND is_active = 1`, 
                { 
                    bind: { role_id: role_id }, 
                    type: QueryTypes.SELECT 
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (role_id: number, req: Request, res: Response) => {
        try {
            // FIXED: tokenData only expects the Request object
            const userId = tokenData(req); 
            const [deleted] = await RoleMasterModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { where: { role_id: role_id as any } }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    }
};

export default RoleMasterDAL;
