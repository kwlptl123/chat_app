import { Request, Response } from "express";
import { Transaction } from "sequelize";
import ChatMembersDAL from "./chat.members.data.layer.js";
import { ChatMembersCreationAttributes, ChatMembersAttributes } from "./chat.members.model.js";

const ChatMembersService = {
    getAll: async (transaction?: Transaction) => {
        return await ChatMembersDAL.getAllDataByView(transaction);
    },

    getById: async (id: number, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await ChatMembersDAL.getDataByIdByView(id, transaction);
    },

    create: async (data: ChatMembersCreationAttributes, transaction?: Transaction) => {
        return await ChatMembersDAL.CreateData(data, transaction);
    },

    update: async (id: number, data: Partial<ChatMembersAttributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await ChatMembersService.getById(id, transaction);
        if (!existingRecord) throw new Error("ChatMembers not found");
        
        return await ChatMembersDAL.UpdateData(id, data, transaction);
    },

    delete: async (id: number, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await ChatMembersService.getById(id, transaction);
        if (!existingRecord) throw new Error("ChatMembers not found");

        return await ChatMembersDAL.deleteDataById(id, req, res, transaction);
    }
};

export default ChatMembersService;
