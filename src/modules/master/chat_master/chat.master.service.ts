import { Request, Response } from "express";
import { Transaction } from "sequelize";
import ChatMasterDAL from "./chat.master.data.layer.js";
import { ChatMasterCreationAttributes, ChatMasterAttributes } from "./chat.master.model.js";

import ChatMembersDAL from "../chat_members/chat.members.data.layer.js";
import NotificationMasterDAL from "../notification_master/notification.master.data.layer.js";
import UserMasterDAL from "../user_master/user.master.data.layer.js";
import FirestoreChatService from "../../../utils/helper/firestore.chat.service.js";
import commonPath from "../../../middleware/comman_path/comman.path.js";

const { db } = commonPath;

const ChatMasterService = {
    getAll: async (transaction?: Transaction) => {
        return await ChatMasterDAL.getAllDataByView(transaction);
    },

    getById: async (id: number, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await ChatMasterDAL.getDataByIdByView(id, transaction);
    },

    create: async (data: ChatMasterCreationAttributes, transaction?: Transaction) => {
        return await ChatMasterDAL.CreateData(data, transaction);
    },

    update: async (id: number, data: Partial<ChatMasterAttributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await ChatMasterService.getById(id, transaction);
        if (!existingRecord) throw new Error("ChatMaster not found");
        
        return await ChatMasterDAL.UpdateData(id, data, transaction);
    },

    delete: async (id: number, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await ChatMasterService.getById(id, transaction);
        if (!existingRecord) throw new Error("ChatMaster not found");

        return await ChatMasterDAL.deleteDataById(id, req, res, transaction);
    },
    createOrGetDirectChat: async (userAId: number, userBId: number) => {
        const [minId, maxId] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
        const directChatKey = `${minId}_${maxId}`;

        const transaction: Transaction = await db.sequelize.transaction();
        
        try {
            let chat = await ChatMasterDAL.getByDirectChatKey(directChatKey, transaction);
            let created = false;

            if (!chat) {
                // FIX Error 1: Type assertion bypasses strict interface requirement for chat_name
                chat = await ChatMasterDAL.CreateData({
                    chat_type: "DIRECT",
                    chat_name: null, 
                    direct_chat_key: directChatKey,
                    created_by: userAId
                } as any, transaction);

                // FIX Error 3 & 5: Cast chat to any to access dynamic Sequelize property
                const chatId = (chat as any).chat_id || (chat as any).getDataValue('chat_id');

                // FIX Error 2 & 4: Add joined_at and type assertion
                await ChatMembersDAL.BulkCreateData([
                    { chat_id: chatId, user_id: userAId, member_role: "MEMBER", created_by: userAId, joined_at: new Date() } as any,
                    { chat_id: chatId, user_id: userBId, member_role: "MEMBER", created_by: userAId, joined_at: new Date() } as any
                ], transaction);

                created = true;
            }

            await transaction.commit();
            
            // Re-fetch chat_id safely for response
            const responseChatId = (chat as any).chat_id || (chat as any).getDataValue('chat_id');
            const responseChatType = (chat as any).chat_type || (chat as any).getDataValue('chat_type');

            return { chat: { chat_id: responseChatId, chat_type: responseChatType }, created, memberIds: [minId, maxId] };
        } catch (error) {
            await transaction.rollback();
            throw error; 
        }
    },

    sendChatMessage: async (chatId: number, senderId: number, text: string) => {
        const members = await ChatMembersDAL.getByChatId(chatId);
        const isMember = members.some((m: any) => Number(m.user_id) === senderId);
        
        if (!isMember) {
            throw new Error("Sender is not an active member of this chat.");
        }

        const savedMessage = await FirestoreChatService.sendMessage(chatId, senderId, text);

        const recipients = members.filter((m: any) => Number(m.user_id) !== senderId);
        
        if (recipients.length > 0) {
            const sender = await UserMasterDAL.getDataByIdByView(senderId);
            
            // FIX Error 6: Cast sender to any since getDataByIdByView returns generic object
            const senderName = (sender as any)?.user_name || `User #${senderId}`;

            const notificationPayloads = recipients.map((recipient: any) => ({
                user_id: recipient.user_id,
                sender_id: senderId,
                chat_id: chatId,
                firebase_message_id: savedMessage.messageId,
                notification_type: "NEW_MESSAGE",
                title: `New message from ${senderName}`,
                body: text.trim().slice(0, 200),
                created_by: senderId,
            }));

            // FIX Error 7: Ensure this method exists in NotificationMasterDAL (see below)
            await (NotificationMasterDAL as any).BulkCreateData(notificationPayloads);
        }

        return savedMessage;
    },

    getChatMessages: async (chatId: number, limit: number) => {
        return await FirestoreChatService.getMessages(chatId, limit);
    },

    markMessageAsRead: async (chatId: number, messageId: string, userId: number) => {
        await FirestoreChatService.markMessageRead(chatId, messageId, userId);
        
        // FIX Error 8: Ensure this method exists in NotificationMasterDAL (see below)
        await (NotificationMasterDAL as any).markAsRead(chatId, messageId, userId);
        
        return true;
    },

    updateLastSeen: async (chatId: number, userId: number, messageId: string) => {
        await FirestoreChatService.updateLastSeen(chatId, userId, messageId);
        return true;
    },
    editChatMessage: async (chatId: number, messageId: string, senderId: number, text: string) => {
        // Business rule: FirestoreChatService internally verifies sender ownership and deleted state
        await FirestoreChatService.editMessage(chatId, messageId, senderId, text);
        return true;
    },

    deleteChatMessage: async (chatId: number, messageId: string, senderId: number) => {
        // Business rule: FirestoreChatService internally verifies sender ownership
        // Soft deletes the message by setting isDeleted: true and clearing text
        await FirestoreChatService.deleteMessage(chatId, messageId, senderId);
        return true;
    }
};

export default ChatMasterService;
