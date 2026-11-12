/**
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the Encryption module. Exposes endpoints to manually
 * encrypt or decrypt payloads for secure API communications.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Verb Isolation: Uses POST to accept payload bodies securely.
 * - Delegation: Routes directly to the EncryptionController.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - app.use("/api/v1", encryptionRoutes);
 */

import express from "express";
import EncryptionController from "./encryption.controller.js";

const router = express.Router();
const basePath = "/api/v1/dev";

// 1. Encrypt an incoming JSON payload
router.post(
  `${basePath}/encrypt`,
  EncryptionController.createEncryption
);

// 2. Decrypt an encrypted string payload
router.post(
  `${basePath}/decrypt`,
  EncryptionController.createDecryption
);

export default router;