/**
 * 1. ARCHITECTURE OVERVIEW:
 * Authentication Controller handling user login, JWT generation, password resets, 
 * and OTP-based validation workflows. Enforces security policies like password 
 * expiry (90 days) and password history tracking to prevent reuse.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Login Flow: Validates user -> Checks Active Status -> Enforces Expiry -> Validates Hash -> Issues JWT.
 * - OTP Flow: Validates Email -> Generates 6-digit OTP -> Saves to DB -> Dispatches Email.
 * - Password Reset: Validates Old Password/OTP -> Checks History (max 3) -> Hashes New -> Updates DB.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - router.post("/login", AuthController.loginUser);
 * - router.post("/forgot-password/otp", AuthController.OtpForPasswordReset);
 * - router.post("/reset-password", AuthController.resetPasswordValidation);
 */

import { Request, Response } from "express";
import JWT from "jsonwebtoken";
import argon2 from "argon2";
import crypto from "crypto";
// Services & Helpers
import commonResponse from "../../../utils/helper/response.js";
import responseCode from "../../../utils/constants/code/http.status.code.js";
import responseConst from "../../../utils/constants/response/response.constant.js";
import logger from "../../../config/logs/winston.config.js";
import tokenData from "../../../utils/helper/meta-data-helper/get.user.id.by.jwt.js";
import currentTime from "../../../utils/helper/meta-data-helper/get.current.time.ist.js";
import argon2Verify from "../../../utils/helper/argon2.helper.js";
import emailTemplatesFiles from "../../../utils/helper/email/email.templates.js";
import sendEmail from "../../../utils/helper/email/send.email.js";
import {parseControllerError } from "../../../utils/helper/mysql.advance.logger.js"

// Domain Services
import authService from "./auth.service.js";
import RoleService from "../../access_control/role_master/role.master.service.js";
import userMasterService from "../../master/user_master/user.master.service.js";
import RESPONSE_CONSTANTS from "../../../utils/constants/response/response.constant.js";
import LocalJsonHelper from "../../../utils/helper/local.json.helper.js"
import GroupRolePagePermissionService from "../../access_control/group_role_page_permission/group.role.page.permission.service.js"
// Safely map nested constants to avoid TypeScript strict-typing errors while retaining runtime functionality
const AUTH_MSG: any = (responseConst as any).AUTH || responseConst;
const DB_SUCCESS_MSG: any = (responseConst as any).DB_SUCCESS || responseConst;
const DB_ERROR_MSG: any = (responseConst as any).DB_ERROR || responseConst;
const SYS_MSG: any = responseConst;


const AuthController = {
 loginUser: async (req: Request, res: Response) => {
    try {
        const { user_name, password } = req.body;
        const userData: any = await authService.getDataByUserName(user_name.trim());
        
        if (!userData) {
            logger.error(`User with name ${user_name} not found`);
            return res.status(responseCode.UNAUTHORIZED).send(
                commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.INVALID_USERNAME || "Invalid Username", null, true)
            );
        }

        const userRecord: any = userData.dataValues ? userData.dataValues : userData;

        if (userRecord.is_active == 0 || userRecord.is_active === false) {
            logger.error(`User with name ${user_name} is not active`);
            return res.status(responseCode.UNAUTHORIZED).send(
                commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.USER_NOT_ACTIVE || "User is not active", null, true)
            );
        }

        const expiryDate = new Date(userRecord.password_expiry_date);
        const currentDate = new Date();
        if ((!userRecord.password_expiry_date || expiryDate < currentDate) && userRecord.role_id != 1) {
            logger.warn(`Password expired for user ${user_name}`);
            return res.status(responseCode.UNAUTHORIZED).send(
                commonResponse(
                    responseCode.UNAUTHORIZED,
                    "Your password has expired. Please update your password to continue.",
                    { is_password_expired: true },
                    true
                )
            );
        }

        const passwordVerify = await argon2Verify.argon2Verify(password, userRecord.password);
        if (!passwordVerify) {
            logger.error(`Password for UserName ${user_name} not Matched`);
            return res.status(responseCode.UNAUTHORIZED).send(
                commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.INVALID_PASSWORD || "Invalid Password", null, true)
            );
        }

        // ==========================================
        // CACHE-FIRST INDEXED DATA RETRIEVAL
        // ==========================================
        
        let getMenuById: any = null;
        let pagePermissions: any = null;

        try {
            // 1. Fast indexed lookup for the singular Role object
            // Assumes the helper class is named LocalJsonHelper or similar
            getMenuById = await LocalJsonHelper.getByKey("RoleMaster", "role_id", userRecord.role_id);
        } catch (cacheError) {
            logger.warn(`[loginUser] RoleMaster cache miss or read error for role_id: ${userRecord.role_id}`);
        }

        // 2. Database fallback if index lookup returns null
        if (!getMenuById) {
            getMenuById = await RoleService.getById(userRecord.role_id);
        }

        try {
            // 3. Fast indexed lookup for the grouped array of permissions
            pagePermissions = await LocalJsonHelper.getAllByKey("GroupRolePagePermission", "role_id", userRecord.role_id);
        } catch (cacheError) {
            logger.warn(`[loginUser] GroupRolePagePermission cache miss or read error for role_id: ${userRecord.role_id}`);
        }

        // 4. Database fallback if array is missing or empty
        if (!pagePermissions || pagePermissions.length === 0) {
            pagePermissions = await GroupRolePagePermissionService.getDataByRoleId(userRecord.role_id);
        }

        // ==========================================
        // JWT CONSTRUCTION & RESPONSE
        // ==========================================

        const token = JWT.sign(
            {
                user_id: userRecord.user_id,
                user_name: userRecord.user_name,
                role_id: userRecord.role_id,
                agent_id: userRecord.agent_id,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: "24h" }
        );

        const jwtResponseData = {
            userDetails: {
                user_id: userRecord.user_id,
                user_name: userRecord.user_name,
                role_id: userRecord.role_id,
                role_name: getMenuById?.role_name,
                agent_id: userRecord.agent_id,
                menu_id: getMenuById?.menu_id ?? null,
                menu: getMenuById?.menu ?? null,
                page_permissions: pagePermissions || [] 
            },
            token: token,
        };

        return res.status(responseCode.OK).send(
            commonResponse(responseCode.OK, AUTH_MSG.LOGGED_IN_SUCCESFULLY || "Logged In Successfully", jwtResponseData)
        );
        
    } catch (error) {
        logger.error(`Error ---> ${error}`);
        const { statusCode, message } = parseControllerError(error);

        // Return using standard format
        return res.status(statusCode).send(
            commonResponse(statusCode, message, null, true)
        );
    }
},

  generateOTP: () => {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expirationDate = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const year = expirationDate.getUTCFullYear();
    const month = String(expirationDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(expirationDate.getUTCDate()).padStart(2, '0');
    const hours = String(expirationDate.getUTCHours()).padStart(2, '0');
    const minutes = String(expirationDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(expirationDate.getUTCSeconds()).padStart(2, '0');

    const timezoneOffset = -expirationDate.getTimezoneOffset();
    const timezoneHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const timezoneMinutes = Math.abs(timezoneOffset) % 60;
    const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
    const timezone = `UTC${timezoneSign}${String(timezoneHours).padStart(2, '0')}:${String(timezoneMinutes).padStart(2, '0')}`;

    return {
      otp,
      otpExpires: `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${timezone}`,
      otpExpires_1: new Date(Date.now() + 10 * 60 * 1000),
    };
  },

  OtpForPasswordReset: async (req: Request, res: Response) => {
    try {
      const email_id = req.body.email_id;
      const checkIfEmailIdIsPresent: any = await authService.checkWheterEmailIsPresent(email_id);
      
      if (!checkIfEmailIdIsPresent || checkIfEmailIdIsPresent.length === 0) {
        return res.status(responseCode.UNAUTHORIZED).send(
          commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.ENTER_A_VALID_EMAIL || "Enter a valid email", null, true)
        );
      }

      const otpData = AuthController.generateOTP();
      const userIdList = checkIfEmailIdIsPresent.map((user: any) => user.user_id);
      const createdBy = Number(tokenData(req)) || 1;
      const createdAt = new Date();

      await authService.updateUser(userIdList, { 
        otp: Number(otpData.otp), 
        otp_time: otpData.otpExpires_1, 
        modified_by: createdBy, 
        modified_at: createdAt 
      });

      const authUserTemplate = await emailTemplatesFiles.generateEmailTemplateOtpResetPassword(otpData.otp, otpData.otpExpires);
      const emailSuccess = await sendEmail(email_id, authUserTemplate.subject, null, authUserTemplate.text, { attachmentBase64: null, attachmentFileNmae: null });
      
      if (emailSuccess) {
        return res.status(responseCode.CREATED).send(
          commonResponse(responseCode.CREATED, DB_SUCCESS_MSG.SUCCESS_ADDING_RECORD || "Record added successfully")
        );
      } else {
        return res.status(responseCode.BAD_REQUEST).send(
          commonResponse(responseCode.BAD_REQUEST, DB_ERROR_MSG.ERROR_ADDING_RECORD || "Error adding record", null, true)
        );
      }
    } catch (error) {
      logger.error(`Error ---> ${error}`);
      const { statusCode, message } = parseControllerError(error);

      // Return using standard format
      return res.status(statusCode).send(
          commonResponse(statusCode, message, null, true)
      );
    }
  },

  resetPasswordValidation: async (req: Request, res: Response) => {
    try {
      const { email_id, otp } = req.body;
      const users: any = await authService.checkWheterEmailIsPresent(email_id);
      
      if (!users || users.length === 0) {
        return res.status(responseCode.UNAUTHORIZED).send(
          commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.ENTER_A_VALID_EMAIL || "Enter a valid email", null, true)
        );
      }

      const user: any = users[0];

      if (user.otp?.toString().trim() !== otp?.toString().trim()) {
        return res.status(responseCode.UNAUTHORIZED).send(
          commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.INVALID_OTP_KINDLY_RECHECK || "Invalid OTP", null, true)
        );
      }

      const otpExpiryDuration = 10 * 60 * 1000;
      const currentDateTime = new Date().getTime();
      
      if (user.generated_at) {
        const otpGeneratedTime = new Date(user.generated_at).getTime();
        if ((currentDateTime - otpGeneratedTime) > otpExpiryDuration) {
          return res.status(responseCode.UNAUTHORIZED).send(
            commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.OTP_HAS_EXPIRED || "OTP has expired", null, true)
          );
        }
      }

      if (user.otp_time && new Date(user.otp_time) < new Date()) {
        return res.status(responseCode.UNAUTHORIZED).send(
          commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.OTP_HAS_EXPIRED || "OTP has expired", null, true)
        );
      }

      return res.status(responseCode.CREATED).send(
        commonResponse(responseCode.CREATED, DB_SUCCESS_MSG.SUCCESS_ADDING_RECORD || "Record added successfully")
      );

    } catch (error) {
      logger.error(`Error ---> ${error}`);
      const { statusCode, message } = parseControllerError(error);

      // Return using standard format
      return res.status(statusCode).send(
          commonResponse(statusCode, message, null, true)
      );
    }
  },

  UpdatePasswordByEmailId: async (req: Request, res: Response) => {
    try {
      const { email_id, password } = req.body;
      const users: any = await authService.checkWheterEmailIsPresent(email_id);
      
      if (!users || users.length === 0) {
        return res.status(responseCode.UNAUTHORIZED).send(
          commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.ENTER_A_VALID_EMAIL || "Enter a valid email", null, true)
        );
      }

      const user: any = users[0];

      if (password) {
        const encrytedPassword = await argon2.hash(password);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        
        const createdBy = Number(user.user_id);
        const createdAt = new Date();

        const updatePassword = await userMasterService.update(user.user_id, { 
          password: encrytedPassword, 
          modified_by: createdBy, 
          modified_at: createdAt, 
          password_expiry_date: expiryDate 
        });


        if (updatePassword) {
          const authUserTemplate = await emailTemplatesFiles.passwordUpdatedSuccessfullyTemplte(user.user_name, user.email_id);
          await sendEmail(email_id, authUserTemplate.subject, null, authUserTemplate.text, { attachmentBase64: null, attachmentFileNmae: null });
          
          return res.status(responseCode.CREATED).send(
            commonResponse(responseCode.CREATED, DB_SUCCESS_MSG.SUCCESS_UPDATING_RECORD || "Record updated successfully")
          );
        }
      }

      return res.status(responseCode.BAD_REQUEST).send(
        commonResponse(responseCode.BAD_REQUEST, DB_ERROR_MSG.ERROR_UPDATING_RECORD || "Error updating record", null, true)
      );

    } catch (error) {
      logger.error(`Error ---> ${error}`);
      const { statusCode, message } = parseControllerError(error);

      // Return using standard format
      return res.status(statusCode).send(
          commonResponse(statusCode, message, null, true)
      );
    }
  },

  passwordResetUpdate: async (req: Request, res: Response) => {
    try {
      const { user_id, password: new_password, old_password } = req.body;
      const createdBy = Number(tokenData(req)) || Number(user_id);
      const createdAt = new Date();
      
      const userRecords: any = await authService.getDataByUserId(user_id);
      
      if (!userRecords || userRecords.length === 0) {
        return res.status(responseCode.UNAUTHORIZED).send(
          commonResponse(responseCode.UNAUTHORIZED, AUTH_MSG.USER_NOT_FOUND || "User not found", null, true)
        );
      }

      const user: any = userRecords[0] ?? userRecords;

      if (!new_password) {
        return res.status(responseCode.BAD_REQUEST).send(
          commonResponse(responseCode.BAD_REQUEST, AUTH_MSG.USER_NOT_FOUND || "User not found", null, true)
        );
      }

      const isOldPasswordCorrect = await argon2.verify(user.password, old_password);
      if (!isOldPasswordCorrect) {
        return res.status(responseCode.BAD_REQUEST).send(
          commonResponse(responseCode.BAD_REQUEST, AUTH_MSG.OLD_PASSWORD_IS_INVALID || "Old password invalid", null, true)
        );
      }


      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);
      const encryptedPassword = await argon2.hash(new_password);
      
      const updatePassword = await authService.updateUserSingleOnly(user_id, { 
        password: encryptedPassword, 
        modified_by: createdBy, 
        modified_at: createdAt, 
        password_expiry_date: expiryDate 
      });


      if (updatePassword) {
        return res.status(responseCode.CREATED).send(
          commonResponse(responseCode.CREATED, DB_SUCCESS_MSG.SUCCESS_UPDATING_RECORD || "Record updated successfully")
        );
      } else {
        return res.status(responseCode.BAD_REQUEST).send(
          commonResponse(responseCode.BAD_REQUEST, DB_ERROR_MSG.ERROR_UPDATING_RECORD || "Error updating record", null, true)
        );
      }
    } catch (error) {
      logger.error(`Error ---> ${error}`);
      const { statusCode, message } = parseControllerError(error);

      // Return using standard format
      return res.status(statusCode).send(
          commonResponse(statusCode, message, null, true)
      );
    }
  },

  _processPasswordHistory: async (userId: number, newPassword: string, oldPasswords: any[] = [], createdBy: number, createdAt: Date) => {
    const now = new Date().toISOString();

    oldPasswords.sort((a, b) => {
      if (a.sequence === b.sequence) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return a.sequence - b.sequence;
    });

    const hashedPassword = await argon2.hash(newPassword);

    if (oldPasswords.length < 3) {
      oldPasswords.push({
        user_id: userId,
        password: hashedPassword,
        date: now,
        sequence: null,
        password_history_id: null,
        is_active: true,
        created_by: createdBy,
        created_at: createdAt
      });
    } else {
      oldPasswords[0] = {
        ...oldPasswords[0],
        password: hashedPassword,
        modified_by: createdBy,
        modified_at: createdAt,
        date: now,
      };
    }

    oldPasswords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return oldPasswords.map((item, index) => ({
      ...item,
      sequence: index + 1
    }));
  }
};

export default AuthController;