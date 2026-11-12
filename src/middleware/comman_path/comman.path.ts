/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * This module acts as a strongly-typed Dependency Injection (DI) facade.
 * By defining the `ICommonPath` interface using `typeof`, TypeScript will
 * strictly enforce the shape, arguments, and return types of every helper
 * function imported here across your entire application.
 * 
 * [Note on Imports]: Under "NodeNext" module resolution, TypeScript requires 
 * imports to use the `.js` extension, even though they resolve to `.ts` files.
 *
 * 2. HIERARCHY & PRIORITY:
 * 1. Imports: Load libraries and internal TS modules.
 * 2. Interface Definition: Map the exact type signature of every import.
 * 3. Aggregation: Bind the imports to the strictly-typed facade object.
 * 4. Export: Freeze the object to guarantee immutability.
 *
 * 3. IMPLEMENTATION EXAMPLES:
 * import commonPath from "../../middleware/comman_path/comman.path.js";
 * // IDE will now provide full intellisense for tokenData arguments:
 * const userId = commonPath.tokenData(req, res);
 * ============================================================================
 */

import dotenv from 'dotenv';
dotenv.config();

// External Libraries
import express from "express"; // Note: removed lowercase { response } if unused
import JWT from "jsonwebtoken";
import argon2 from 'argon2';
import path from 'path';
import fs from "fs";
import { fileURLToPath } from 'url';

// Internal Configurations & Constants
import responseConst from "../../utils/constants/response/response.constant.js";
import commonResponse from "../../utils/helper/response.js";
import responseCode from "../../utils/constants/code/http.status.code.js";
import logger from "../../config/logs/winston.config.js"; 
import db from "../../modules/index.js"; 
import STORE_PROCEDURES from "../../utils/db/procedures.constants.js"; 
import ViewFieldTableWise from "../../utils/db/view.fields.constants.js"; 
import TABLE_VIEW_FOLDER_MAP from '../../utils/constants/id_constant/local.json.constant.js';

// Internal Helpers & Security
import tokenData from "../../utils/helper/meta-data-helper/get.user.id.by.jwt.js";
import currentTime from "../../utils/helper/meta-data-helper/get.current.time.ist.js";
import encrypt from "../../utils/security/encrypt.js";
import decrypt from "../../utils/security/decrypt.js";
import createUpdateMetadata from "../../utils/helper/meta-data-helper/meta.data.js";
import verifyToken from "../auth/authJwt.js";
// import notificationTemplates from '../../utils/helper/notification.templates.js';
import LocalJsonHelper from "../../utils/helper/local.json.helper.js";

// IMPORT VALUES AND TYPES
import { MysqlAdvanceLogger, AppErrorResult,parseControllerError } from "../../utils/helper/mysql.advance.logger.js";
import { Request, Response } from "express";
import { Op, QueryTypes,Transaction } from 'sequelize'; // Import it here with Op

const basePathRoute: string = `${process.env.BASE_ROUTE_PATH || '/api/v1'}`;

// 1. Explicitly define the TypeScript Interface using `typeof`
export interface ICommonPath {
    responseConst: typeof responseConst;
    commonResponse: typeof commonResponse;
    responseCode: typeof responseCode;
    logger: typeof logger;
    tokenData: typeof tokenData;
    currentTime: typeof currentTime;
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    createUpdateMetadata: typeof createUpdateMetadata;
    db: typeof db;
    STORE_PROCEDURES: typeof STORE_PROCEDURES;
    ViewFieldTableWise: typeof ViewFieldTableWise;
    express: typeof express;
    verifyToken: typeof verifyToken;
    basePathRoute: string;
    JWT: typeof JWT;
    path: typeof path;
    fs: typeof fs;
    fileURLToPath: typeof fileURLToPath;
    // notificationTemplates: typeof notificationTemplates;
    LocalJsonHelper: typeof LocalJsonHelper;
    TABLE_VIEW_FOLDER_MAP: typeof TABLE_VIEW_FOLDER_MAP;
    argon2: typeof argon2;
    MysqlAdvanceLogger: typeof MysqlAdvanceLogger;
    parseControllerError:typeof parseControllerError;
    Op: typeof Op;
    QueryTypes: typeof QueryTypes;
    // Request and Response REMOVED from here. They are types.
}

// 2. Bind the imports to the strictly typed interface
const commonPath: ICommonPath = Object.freeze({
    responseConst,
    commonResponse,
    responseCode,
    logger,
    tokenData,
    currentTime,
    encrypt,
    decrypt,
    createUpdateMetadata,
    db,
    STORE_PROCEDURES,
    ViewFieldTableWise,
    express,
    verifyToken,
    basePathRoute,
    JWT,
    path,
    fs,
    fileURLToPath,
    // notificationTemplates,
    LocalJsonHelper,
    parseControllerError,
    TABLE_VIEW_FOLDER_MAP,
    argon2,
    MysqlAdvanceLogger,
    Op,
    QueryTypes,

    // Request and Response REMOVED from here.
});

// EXPORT ALL TYPES HERE SO OTHER FILES CAN IMPORT THEM DIRECTLY
export type { AppErrorResult, Request, Response,Transaction };
export default commonPath;