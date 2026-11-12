/*
 * ARCHITECTURE OVERVIEW: Data Access Layer (DAL) for ChatMembers records. 
 * Database interactions are executed via Sequelize, and any resulting exceptions 
 * are intercepted, normalized by MysqlAdvanceLogger, and thrown as structured AppErrorResult objects.
 */
import ChatMembersModel, { ChatMembersCreationAttributes, ChatMembersAttributes } from "./chat.members.model.js";

import commonPath, { AppErrorResult, Request, Response, Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData, ViewFieldTableWise, MysqlAdvanceLogger, QueryTypes, Op } = commonPath;

const ChatMembersDAL = {
    CreateData: async (data: ChatMembersCreationAttributes, transaction?: Transaction) => {
        try {
            return await ChatMembersModel(db.sequelize).create(data, { transaction });
        } catch (error) {
            // Intercept and structure the error
            const resolved: AppErrorResult = MysqlAdvanceLogger.resolve(error);
            throw resolved;
        }
    },

    UpdateData: async (chat_member_id: number, data: Partial<ChatMembersAttributes>, transaction?: Transaction) => {
        try {
            return await ChatMembersModel(db.sequelize).update(data, { 
                where: { chat_member_id: chat_member_id as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.CHAT_MEMBERS_FIELDS} `, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (chat_member_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.CHAT_MEMBERS_FIELDS} WHERE chat_member_id =$chat_member_id`, 
                { 
                    bind: { chat_member_id: chat_member_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (chat_member_id: number, req: Request, res: Response, transaction?: Transaction) => {
        try {
            const userId = tokenData(req); 
            const [deleted] = await ChatMembersModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { chat_member_id: chat_member_id as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },BulkCreateData: async (data: ChatMembersCreationAttributes[], transaction?: Transaction) => {
        try {
            return await ChatMembersModel(db.sequelize).bulkCreate(data, { transaction });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getByChatId: async (chat_id: number, transaction?: Transaction) => {
        try {
            return await ChatMembersModel(db.sequelize).findAll({
                where: { chat_id: chat_id as any, is_active: true },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    }
    
};

export default ChatMembersDAL;
