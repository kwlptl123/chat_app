import { Request, Response } from "express";
import { Transaction } from "sequelize";
import NotificationMasterDAL from "./notification.master.data.layer.js";
import { NotificationMasterCreationAttributes, NotificationMasterAttributes } from "./notification.master.model.js";

const NotificationMasterService = {
    getAll: async (transaction?: Transaction) => {
        return await NotificationMasterDAL.getAllDataByView(transaction);
    },

    getById: async (id: number, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await NotificationMasterDAL.getDataByIdByView(id, transaction);
    },

    create: async (data: NotificationMasterCreationAttributes, transaction?: Transaction) => {
        return await NotificationMasterDAL.CreateData(data, transaction);
    },

    update: async (id: number, data: Partial<NotificationMasterAttributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await NotificationMasterService.getById(id, transaction);
        if (!existingRecord) throw new Error("NotificationMaster not found");
        
        return await NotificationMasterDAL.UpdateData(id, data, transaction);
    },

    delete: async (id: number, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await NotificationMasterService.getById(id, transaction);
        if (!existingRecord) throw new Error("NotificationMaster not found");

        return await NotificationMasterDAL.deleteDataById(id, req, res, transaction);
    }
};

export default NotificationMasterService;
