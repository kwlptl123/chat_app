/**
 * 1. ARCHITECTURE OVERVIEW:
 * Encryption Controller for handling manual payload encryption and decryption.
 * Useful for secure client-server communication where payloads are encrypted
 * before transit and decrypted upon receipt.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Validation: Ensures the request body exists before processing.
 * - Processing: Delegates actual cryptographic operations to utility functions.
 * - Error Handling: Catches and standardizes any encryption/decryption failures.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - router.post("/encrypt", EncryptionController.createEncryption);
 * - router.post("/decrypt", EncryptionController.createDecryption);
 */

import { Request, Response } from "express";

// Pointing to your specific utility files
import encrypt from "../../../utils/security/encrypt.js";
import decrypt from "../../../utils/security/decrypt.js";

import commonResponse from "../../../utils/helper/response.js";
import responseCode from "../../../utils/constants/code/http.status.code.js";
import responseConst from "../../../utils/constants/response/response.constant.js";
import {parseControllerError } from "../../../utils/helper/mysql.advance.logger.js"


// Safely cast constants to 'any' to bypass strict TS typing on nested objects
const RES_CONST: any = responseConst;
const SYS_MSG: any = RES_CONST.INTERNAL_SERVER_ERROR || RES_CONST;

const EncryptionController = {
  createEncryption: async (req: Request, res: Response) => {
    // Express typically parses empty bodies as {} rather than undefined
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(responseCode.BAD_REQUEST).send({ message: "Body required!" });
    }
    
    const plainTextPayload = req.body;
    
    try {
      // 1. Encrypt the raw request body payload
      const encryptedText = encrypt(plainTextPayload);
      
      return res.status(responseCode.OK).send(encryptedText);
    } catch (error) {
      console.error("Encryption Error:", error);
      const { statusCode, message } = parseControllerError(error);

      // Return using standard format
      return res.status(statusCode).send(
          commonResponse(statusCode, message, null, true)
      );
    }
  },

  createDecryption: async (req: Request, res: Response) => {
    const encryptedText = req.body.reqBody;
    console.log("inside decrypt")
    if (!encryptedText) {
      return res.status(responseCode.BAD_REQUEST).send({ message: "reqBody field is required!" });
    }

    try {
      // 2. Decrypt the specific reqBody payload string
      const decryptedText = decrypt(encryptedText);
      
      return res.status(responseCode.OK).send({ resBody: decryptedText });
    } catch (error) {
      console.error("Decryption Error:", error);
      const { statusCode, message } = parseControllerError(error);

        // Return using standard format
        return res.status(statusCode).send(
            commonResponse(statusCode, message, null, true)
        );
    }
  }
};

export default EncryptionController;