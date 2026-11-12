import ValidatorHelper, { Schema } from "../../../utils/helper/validator.helper.js";

/**
 * Schema Definition for ChatMembers
 * This single schema drives both CREATE (strict) and UPDATE (partial) validations.
 */
const ChatMembersSchema: Schema = {
    chat_id: { type: "int", required: true, message: "Chat Id is required." },
    user_id: { type: "int", required: true, message: "User Id is required." },
    member_role: { type: "string", required: true, message: "Member Role is required." },
    joined_at: { type: "date", required: true, message: "Joined At is required." }
};

// Id param is always a number; validate() sends the 400 response itself on failure
export const validateChatMembersIdParam = ValidatorHelper.validate(
    ValidatorHelper.idParam("id", "number")
);

// Enforces all 'required: true' fields (sends the 400 response itself on failure)
export const validateCreateChatMembers = ValidatorHelper.schema(ChatMembersSchema);

// Makes all fields optional for PATCH/PUT, but strictly validates the types of provided fields
export const validateUpdateChatMembers = ValidatorHelper.partial(ChatMembersSchema);
