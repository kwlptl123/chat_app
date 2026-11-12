import ValidatorHelper, { Schema } from "../../../utils/helper/validator.helper.js";

/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 *    Schema Definitions for ChatMaster.
 *    Drives both standard CRUD (CREATE/UPDATE) and custom Chat Domain validations.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. STANDARD CRUD SCHEMAS
// ----------------------------------------------------------------------------
const ChatMasterSchema: Schema = {
    chat_type: { type: "string", required: true, message: "Chat Type is required." },
    chat_name: { type: "string", max: 150 },
    direct_chat_key: { type: "string", max: 50 }
};

export const validateChatMasterIdParam = ValidatorHelper.validate(
    // idParam expects "number"
    ValidatorHelper.idParam("id", "number")
);
export const validateCreateChatMaster = ValidatorHelper.schema(ChatMasterSchema);
export const validateUpdateChatMaster = ValidatorHelper.partial(ChatMasterSchema);

// ----------------------------------------------------------------------------
// 2. CUSTOM CHAT DOMAIN SCHEMAS
// ----------------------------------------------------------------------------

export const validateChatIdParam = ValidatorHelper.validate(
    // idParam expects "number"
    ValidatorHelper.idParam("chatId", "number")
);

export const validateMessageIdParam = ValidatorHelper.validate(
    // idParam expects "number"
    ValidatorHelper.idParam("chatId", "number"),
    ValidatorHelper.idParam("messageId", "string")
);

const CreateDirectChatSchema: Schema = {
    // Schemas expect "int"
    userAId: { type: "int", required: true, message: "userAId is required." },
    userBId: { type: "int", required: true, message: "userBId is required." }
};
export const validateCreateDirectChat = ValidatorHelper.schema(CreateDirectChatSchema);

const CreateGroupChatSchema: Schema = {
    chatName: { type: "string", required: true, message: "chatName is required." },
    creatorId: { type: "int", required: true, message: "creatorId is required." },
    memberIds: { type: "array", required: true, message: "memberIds array is required." }
};
export const validateCreateGroupChat = ValidatorHelper.schema(CreateGroupChatSchema);

const SendMessageSchema: Schema = {
    senderId: { type: "int", required: true, message: "senderId is required." },
    text: { type: "string", required: true, message: "text content is required." }
};
export const validateSendMessage = ValidatorHelper.schema(SendMessageSchema);

const MarkMessageReadSchema: Schema = {
    userId: { type: "int", required: true, message: "userId is required." }
};
export const validateMarkMessageRead = ValidatorHelper.schema(MarkMessageReadSchema);

const UpdateLastSeenSchema: Schema = {
    userId: { type: "int", required: true, message: "userId is required." },
    messageId: { type: "string", required: true, message: "messageId is required." }
};

const EditMessageSchema: Schema = {
    senderId: { type: "int", required: true, message: "senderId is required." },
    text: { type: "string", required: true, message: "Updated text is required." }
};
export const validateEditMessage = ValidatorHelper.schema(EditMessageSchema);

const DeleteMessageSchema: Schema = {
    senderId: { type: "int", required: true, message: "senderId is required." }
};
export const validateDeleteMessage = ValidatorHelper.schema(DeleteMessageSchema);
export const validateUpdateLastSeen = ValidatorHelper.schema(UpdateLastSeenSchema);