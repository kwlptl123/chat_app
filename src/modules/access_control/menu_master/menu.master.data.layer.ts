import MenuMasterModel, { MenuMasterCreationAttributes, MenuMasterAttributes } from "./menu.master.model.js";

import commonPath, { AppErrorResult, Request, Response,Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData,ViewFieldTableWise,MysqlAdvanceLogger,QueryTypes,Op} = commonPath;

const MenuMasterDAL = {
    CreateData: async (data: MenuMasterCreationAttributes) => {
        try {
            return await MenuMasterModel(db.sequelize).create(data);
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    UpdateData: async (menu_id: number, data: Partial<MenuMasterAttributes>) => {
        try {
            return await MenuMasterModel(db.sequelize).update(data, { 
                where: { menu_id: menu_id as any } 
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async () => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.MENU_MASTER_FIELDS} WHERE is_active = 1 AND deleted_at IS NULL`, 
                { type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (menu_id: number) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.MENU_MASTER_FIELDS} WHERE menu_id =$menu_id AND is_active = 1`, 
                { 
                    bind: { menu_id: menu_id }, 
                    type: QueryTypes.SELECT 
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (menu_id: number, req: Request, res: Response) => {
        try {
            // FIXED: tokenData only expects the Request object
            const userId = tokenData(req); 
            const [deleted] = await MenuMasterModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { where: { menu_id: menu_id as any } }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    }
};

export default MenuMasterDAL;
