/**
 * ARCHITECTURE OVERVIEW:
 * Centralized database context and ORM initializer using Sequelize. 
 */

// console.log("🔥 DATABASE MODULE LOADED:", new Date().toISOString());

import { Sequelize } from "sequelize";
import dbConfig, { DatabaseConfig } from "../config/db/db.config.js";
import logger from "../config/logs/winston.config.js";

// 1. Import model factories from neighboring domain directories
import MenuMasterModel from "./access_control/menu_master/menu.master.model.js";
import RoleMasterModel from "./access_control/role_master/role.master.model.js";
import UserMasterModel from "./master/user_master/user.master.model.js";
import PageModel from "./access_control/page/page.model.js";
import PermissionModel from "./access_control/permission/permission.model.js";
import PagePermissionModel from "./access_control/page_permission/page.permission.model.js";
import GroupRolePagePermissionModel from "./access_control/group_role_page_permission/group.role.page.permission.model.js";
import ChatMembersModel from "./master/chat_members/chat.members.model.js";
import ChatMasterModel from "./master/chat_master/chat.master.model.js";
import NotificationMasterModel from "./master/notification_master/notification.master.model.js";
// --- GENERATOR: IMPORTS ---

// 2. Define the strict shape of the exported database context
export interface DbContext {
    Sequelize: typeof Sequelize;
    sequelize: Sequelize;
    MenuMasterModel: ReturnType<typeof MenuMasterModel>;
    RoleMasterModel: ReturnType<typeof RoleMasterModel>;
    UserMasterModel: ReturnType<typeof UserMasterModel>;
    PageModel: ReturnType<typeof PageModel>;
    PermissionModel: ReturnType<typeof PermissionModel>;
    PagePermissionModel: ReturnType<typeof PagePermissionModel>;
    GroupRolePagePermissionModel: ReturnType<typeof GroupRolePagePermissionModel>;
    ChatMembersModel: ReturnType<typeof ChatMembersModel>;
    ChatMasterModel: ReturnType<typeof ChatMasterModel>;
    NotificationMasterModel: ReturnType<typeof NotificationMasterModel>;
    // --- GENERATOR: INTERFACES ---
}

const environment = (process.env.NODE_ENV as keyof DatabaseConfig) || "development";
const config = dbConfig[environment];

const isDebugMode = process.env.DEBUG === 'true';

// 4. Initialize the Sequelize connection pool
const sequelize = new Sequelize(
    config.DB,
    config.USER,
    config.PASSWORD || "",
    {
        host: config.HOST,
        dialect: config.DIALECT,

        pool: {
            max: config.pool.max,
            min: config.pool.min,
            acquire: config.pool.acquire,
            idle: config.pool.idle,
        },

        // 4. CRITICAL FIX: Benchmark must be 'true' for the logging function to receive the 'timing' argument
        benchmark: true,

        logging: (sql: string, timing?: number) => {
            const elapsed = timing ?? 0;

            // 5. If debug is explicitly enabled via environment, print the query to the terminal
            if (isDebugMode) {
                console.log(`[SQL DEBUG] ${elapsed}ms | ${sql}`);
            }

            // 6. Persistent Performance Monitoring: Always warn on slow queries regardless of debug state
            if (elapsed > 100) {
                const slowQueryMessage = `🐢 SLOW SQL: ${elapsed} ms | ${sql}`;
                
                console.warn(slowQueryMessage);
                logger.warn(slowQueryMessage);
            }
        },
    }
);

// console.log("🚀 DB MODEL INITIALIZATION START");
// const modelStart = performance.now();

// 5. Execute model factories to bind schemas to the active connection
const initializedMenuMasterModel = MenuMasterModel(sequelize);
const initializedRoleMasterModel = RoleMasterModel(sequelize);
const initializedUserMasterModel = UserMasterModel(sequelize);
const initializedPageModel = PageModel(sequelize);
const initializedPermissionModel = PermissionModel(sequelize);
const initializedPagePermissionModel = PagePermissionModel(sequelize);
const initializedGroupRolePagePermissionModel = GroupRolePagePermissionModel(sequelize);
const initializedChatMembersModel = ChatMembersModel(sequelize);
const initializedChatMasterModel = ChatMasterModel(sequelize);
const initializedNotificationMasterModel = NotificationMasterModel(sequelize);
// --- GENERATOR: INITS ---

// 6. Construct the unified, strictly typed database context object
const db: DbContext = {
    Sequelize,
    sequelize,
    MenuMasterModel: initializedMenuMasterModel,
    RoleMasterModel: initializedRoleMasterModel,
    UserMasterModel: initializedUserMasterModel,
    PageModel: initializedPageModel,
    PermissionModel: initializedPermissionModel,
    PagePermissionModel: initializedPagePermissionModel,
    GroupRolePagePermissionModel: initializedGroupRolePagePermissionModel,
    ChatMembersModel: initializedChatMembersModel,
    ChatMasterModel: initializedChatMasterModel,
    NotificationMasterModel: initializedNotificationMasterModel,
    // --- GENERATOR: EXPORTS ---
};

// console.log(
//     `🚀 DB MODEL INITIALIZATION END: ${(performance.now() - modelStart).toFixed(2)} ms`
// );

export default db;