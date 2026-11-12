import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Emulate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  // 1. Resolve the path to the downloaded JSON file
  const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");
  
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
  }

  // 2. Read and parse the JSON file directly
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  // 3. Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestoreDb = admin.firestore();
firestoreDb.settings({ ignoreUndefinedProperties: true });
export const FirestoreTimestamp = admin.firestore.Timestamp;
export const FirestoreFieldValue = admin.firestore.FieldValue;