import PermissionModel, { PermissionCreationAttributes, PermissionAttributes } from "./permission.model.js";

import commonPath, { AppErrorResult, Request, Response,Transaction } from "../../../middleware/comman_path/comman.path.js";
const { db, tokenData,ViewFieldTableWise,MysqlAdvanceLogger,QueryTypes,Op} = commonPath;

const PermissionDAL = {
    CreateData: async (data: PermissionCreationAttributes, transaction?: Transaction) => {
        try {
            return await PermissionModel(db.sequelize).create(data, { transaction });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    UpdateData: async (permission_id: number, data: Partial<PermissionAttributes>, transaction?: Transaction) => {
        try {
            return await PermissionModel(db.sequelize).update(data, { 
                where: { permission_id: permission_id as any },
                transaction
            });
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getAllDataByView: async (transaction?: Transaction) => {
        try {
            return await db.sequelize.query(
                `${ViewFieldTableWise.PERMISSION_FIELDS} `, 
                { type: QueryTypes.SELECT, transaction }
            );
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    getDataByIdByView: async (permission_id: number, transaction?: Transaction) => {
        try {
            const result = await db.sequelize.query(
                `${ViewFieldTableWise.PERMISSION_FIELDS} WHERE permission_id =$permission_id`, 
                { 
                    bind: { permission_id: permission_id }, 
                    type: QueryTypes.SELECT,
                    transaction
                }
            );
            return result[0] ?? null;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },

    deleteDataById: async (permission_id: number, req: Request, res: Response, transaction?: Transaction) => {
        try {
            // FIXED: tokenData only expects the Request object
            const userId = tokenData(req); 
            const [deleted] = await PermissionModel(db.sequelize).update(
                { is_active: false, deleted_by: userId, deleted_at: new Date() } as any, 
                { 
                    where: { permission_id: permission_id as any },
                    transaction
                }
            );
            return deleted;
        } catch (error) {
            throw MysqlAdvanceLogger.resolve(error);
        }
    },
    getPermissionByDescByOnlyOne: async () => {
    try {
        // 1. Execute findAll with strictly typed numeric property checks
        const latestPermission = await PermissionModel(db.sequelize).findAll({
            where: {
                // 2. Secure by Default: Isolate actively managed records
                is_active: true,
                
                // 3. No Magic: Use Op.gt (greater than) 0. 
                // This bypasses the TS null-type constraint for numeric fields while perfectly aligning with your architecture that permission values are multiples of 2 starting from 1.
                permission_values: {
                    [Op.gt]: 0
                }
            },
            // 4. Sort descending by primary key to retrieve the most recent chronological entry
            order: [['permission_id', 'DESC']],
            
            // 5. Cap the result set safely to exactly 1 record
            limit: 1
        });
        
        return latestPermission;
        
    } catch (error: any) {
        // 6. Rethrow securely to the controller layer without masking the internal exception
        throw MysqlAdvanceLogger.resolve(error);
    }
},
};

export default PermissionDAL;
