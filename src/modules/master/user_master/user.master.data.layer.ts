import { Request, Response } from "express";
import { QueryTypes,Op } from "sequelize";
import UserMasterModel, { UserMasterCreationAttributes, UserMasterAttributes } from "./user.master.model.js";
import commonPath from "../../../middleware/comman_path/comman.path.js";


// Dynamically import the centralized View Queries
import ViewFieldTableWise from "../../../utils/db/view.fields.constants.js";

const { db, tokenData,MysqlAdvanceLogger } = commonPath;

const UserMasterDAL = {
    CreateData: async (data: UserMasterCreationAttributes) => {
        try {
            return await UserMasterModel(db.sequelize).create(data);
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    UpdateData: async (user_id: number, data: Partial<UserMasterAttributes>) => {
        try {
            return await UserMasterModel(db.sequelize).update(data, { 
                where: { user_id: user_id as any } 
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async () => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.USER_MASTER_FIELDS} WHERE is_active = 1 AND deleted_at IS NULL`, 
                { type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (user_id: number) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.USER_MASTER_FIELDS} WHERE user_id =$user_id AND is_active = 1`, 
                { 
                    bind: { user_id: user_id }, 
                    type: QueryTypes.SELECT 
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (user_id: number, req: Request, res: Response) => {
        try {
            // FIXED: tokenData only expects the Request object
            const userId = tokenData(req); 
            const [deleted] = await UserMasterModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { where: { user_id: user_id as any } }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },getUserByUserName: async (user_name: string) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.USER_MASTER_FIELDS} WHERE user_name = $user_name OR email = $user_name `, 
                {
                    bind: { user_name: user_name }, 
                    type: QueryTypes.SELECT 
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getUserByEmail: async (email: string) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.USER_MASTER_FIELDS} WHERE email = $email AND is_active = 1`, 
                { 
                    bind: { email: email }, 
                    type: QueryTypes.SELECT 
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getByEmployeeNumberByView: async (emp_number: string) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.USER_MASTER_FIELDS} WHERE emp_number = $emp_number AND is_active = 1`, 
                { 
                    bind: { emp_number: emp_number }, 
                    type: QueryTypes.SELECT 
                }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getUserDataByRoleIdByView: async (role_id: number) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.USER_MASTER_FIELDS} WHERE role_id = $role_id AND is_active = 1`, 
                { 
                    bind: { role_id: role_id }, 
                    type: QueryTypes.SELECT 
                }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getUserDataOfAdminAndOperatorForMail: async () => {
        try {
            // 4. Hardcoded role lookup (1 = Admin, 3 = Operator) for automated mailing logic
            return await db.sequelize.query(
                `${ViewFieldTableWise.USER_MASTER_FIELDS} WHERE role_id IN (1, 3) AND is_active = 1`, 
                { type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },updateUserByIn: async (user_ids: number[], data: Partial<UserMasterAttributes>) => {
        try {
            // Process bulk updates using the Sequelize Op.in operator
            return await UserMasterModel(db.sequelize).update(data, {
                where: { 
                    user_id: { [Op.in]: user_ids } as any 
                },
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },
};

export default UserMasterDAL;
