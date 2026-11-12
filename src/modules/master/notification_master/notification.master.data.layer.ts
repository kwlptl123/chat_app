/*
 * ARCHITECTURE OVERVIEW: Data Access Layer (DAL) for NotificationMaster records. 
 * Database interactions are executed via Sequelize, and any resulting exceptions 
 * are intercepted, normalized by MysqlAdvanceLogger, and thrown as structured AppErrorResult objects.
 */
import NotificationMasterModel, { NotificationMasterCreationAttributes, NotificationMasterAttributes } from "./notification.master.model.js";

import commonPath, { AppErrorResult, Request, Response, Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData, ViewFieldTableWise, MysqlAdvanceLogger, QueryTypes, Op } = commonPath;

const NotificationMasterDAL = {
    CreateData: async (data: NotificationMasterCreationAttributes, transaction?: Transaction) => {
        try {
            return await NotificationMasterModel(db.sequelize).create(data, { transaction });
        } catch (error) {
            // Intercept and structure the error
            const resolved: AppErrorResult = MysqlAdvanceLogger.resolve(error);
            throw resolved;
        }
    },

    UpdateData: async (notification_id: number, data: Partial<NotificationMasterAttributes>, transaction?: Transaction) => {
        try {
            return await NotificationMasterModel(db.sequelize).update(data, { 
                where: { notification_id: notification_id as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.NOTIFICATION_MASTER_FIELDS} `, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (notification_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.NOTIFICATION_MASTER_FIELDS} WHERE notification_id =$notification_id`, 
                { 
                    bind: { notification_id: notification_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (notification_id: number, req: Request, res: Response, transaction?: Transaction) => {
        try {
            const userId = tokenData(req); 
            const [deleted] = await NotificationMasterModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { notification_id: notification_id as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },
    BulkCreateData: async (data: any[], transaction?: Transaction) => {
        try {
            return await NotificationMasterModel(db.sequelize).bulkCreate(data, { transaction });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    markAsRead: async (chatId: number, messageId: string, userId: number) => {
        try {
            return await NotificationMasterModel(db.sequelize).update(
                { is_read: true, read_at: new Date() } as any,
                { 
                    where: { 
                        chat_id: chatId as any, 
                        firebase_message_id: messageId as any, 
                        user_id: userId as any 
                    } 
                }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    }
};

export default NotificationMasterDAL;
