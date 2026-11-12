import ValidatorHelper, { Schema } from "../../../utils/helper/validator.helper.js";

/**
 * Schema Definition for NotificationMaster
 * This single schema drives both CREATE (strict) and UPDATE (partial) validations.
 */
const NotificationMasterSchema: Schema = {
    user_id: { type: "int", required: true, message: "User Id is required." },
    sender_id: { type: "int" },
    chat_id: { type: "int" },
    firebase_message_id: { type: "string", max: 128 },
    notification_type: { type: "string", required: true, message: "Notification Type is required." },
    title: { type: "string", required: true, max: 150, message: "Title is required." },
    body: { type: "string", required: true, message: "Body is required." },
    is_read: { type: "boolean", required: true, message: "Is Read is required." },
    read_at: { type: "date" }
};

// Id param is always a number; validate() sends the 400 response itself on failure
export const validateNotificationMasterIdParam = ValidatorHelper.validate(
    ValidatorHelper.idParam("id", "number")
);

// Enforces all 'required: true' fields (sends the 400 response itself on failure)
export const validateCreateNotificationMaster = ValidatorHelper.schema(NotificationMasterSchema);

// Makes all fields optional for PATCH/PUT, but strictly validates the types of provided fields
export const validateUpdateNotificationMaster = ValidatorHelper.partial(NotificationMasterSchema);
