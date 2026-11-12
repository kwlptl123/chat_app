/*
 * ARCHITECTURE OVERVIEW: Data Access Layer (DAL) for ChatMaster records. 
 * Database interactions are executed via Sequelize, and any resulting exceptions 
 * are intercepted, normalized by MysqlAdvanceLogger, and thrown as structured AppErrorResult objects.
 */
import ChatMasterModel, { ChatMasterCreationAttributes, ChatMasterAttributes } from "./chat.master.model.js";

import commonPath, { AppErrorResult, Request, Response, Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData, ViewFieldTableWise, MysqlAdvanceLogger, QueryTypes, Op } = commonPath;

const ChatMasterDAL = {
    CreateData: async (data: ChatMasterCreationAttributes, transaction?: Transaction) => {
        try {
            return await ChatMasterModel(db.sequelize).create(data, { transaction });
        } catch (error) {
            // Intercept and structure the error
            const resolved: AppErrorResult = MysqlAdvanceLogger.resolve(error);
            throw resolved;
        }
    },

    UpdateData: async (chat_id: number, data: Partial<ChatMasterAttributes>, transaction?: Transaction) => {
        try {
            return await ChatMasterModel(db.sequelize).update(data, { 
                where: { chat_id: chat_id as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.CHAT_MASTER_FIELDS} `, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (chat_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.CHAT_MASTER_FIELDS} WHERE chat_id =$chat_id`, 
                { 
                    bind: { chat_id: chat_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (chat_id: number, req: Request, res: Response, transaction?: Transaction) => {
        try {
            const userId = tokenData(req); 
            const [deleted] = await ChatMasterModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { chat_id: chat_id as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },getByDirectChatKey: async (direct_chat_key: string, transaction?: Transaction) => {
        try {
            return await ChatMasterModel(db.sequelize).findOne({
                where: { direct_chat_key: direct_chat_key as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },
};

export default ChatMasterDAL;
