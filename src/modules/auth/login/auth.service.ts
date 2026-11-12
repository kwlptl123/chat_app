/**
 * 1. ARCHITECTURE OVERVIEW:
 * Service layer for Authentication workflows. Orchestrates queries related to 
 * user identity verification, OTP dispatch, and password resets by acting as 
 * a boundary between the AuthController and the UserMaster Data Access Layer.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Read Operations: Fetches user existence and status directly from the DAL.
 * - Write Operations: Dispatches single or bulk user updates (e.g., OTP insertion).
 * - Error Handling: Relies on automatic promise rejection bubbling (no redundant try/catch).
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - const user = await AuthService.getDataByUserName("admin");
 * - await AuthService.updateUserSingleOnly(1, { password: newHashedPassword });
 */

import UserMasterDAL from "../../master/user_master/user.master.data.layer.js";
import { UserMasterAttributes } from "../../master/user_master/user.master.model.js";

const AuthService = {
    getDataByUserName: async (username: string) => {
        // 1. Fetch user entity for login verification
        return await UserMasterDAL.getUserByUserName(username);
    },

    checkWheterEmailIsPresent: async (email: string) => {
        // 2. Fetch user list for OTP/Forgot password flows
        // Wrapping in an array to match the controller's expectation of a list
        const user = await UserMasterDAL.getUserByEmail(email);
        return user ? [user] : [];
    },

    updateUser: async (user_ids: number[], data: Partial<UserMasterAttributes>) => {
        // 3. Bulk update (e.g., applying OTP to all accounts sharing an email)
        return await UserMasterDAL.updateUserByIn(user_ids, data);
    },

    getDataByUserId: async (user_id: number) => {
        // 4. Verification step during password reset
        const user = await UserMasterDAL.getDataByIdByView(user_id);
        return user ? [user] : [];
    },

    updateUserSingleOnly: async (user_id: number, data: Partial<UserMasterAttributes>) => {
        // 5. Explicit single-user update for targeted password resets
        return await UserMasterDAL.UpdateData(user_id, data);
    }
};

export default AuthService;