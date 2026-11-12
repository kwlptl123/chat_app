import PageModel, { PageCreationAttributes, PageAttributes } from "./page.model.js";

import commonPath, { AppErrorResult, Request, Response,Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData,ViewFieldTableWise,MysqlAdvanceLogger,QueryTypes,Op} = commonPath;

const PageDAL = {
    CreateData: async (data: PageCreationAttributes, transaction?: Transaction) => {
        try {
            return await PageModel(db.sequelize).create(data, { transaction });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    UpdateData: async (page_id: number, data: Partial<PageAttributes>, transaction?: Transaction) => {
        try {
            return await PageModel(db.sequelize).update(data, { 
                where: { page_id: page_id as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.PAGE_FIELDS} `, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (page_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.PAGE_FIELDS} WHERE page_id =$page_id`, 
                { 
                    bind: { page_id: page_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (page_id: number, req: Request, res: Response, transaction?: Transaction) => {
        try {
            // FIXED: tokenData only expects the Request object
            const userId = tokenData(req); 
            const [deleted] = await PageModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { page_id: page_id as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    }
};

export default PageDAL;
