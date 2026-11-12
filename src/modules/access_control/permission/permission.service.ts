import { Request, Response } from "express";
import { Transaction } from "sequelize";
import PermissionDAL from "./permission.data.layer.js";
import { PermissionCreationAttributes, PermissionAttributes } from "./permission.model.js";

const PermissionService = {
    getAll: async (transaction?: Transaction) => {
        return await PermissionDAL.getAllDataByView(transaction);
    },

    getById: async (id: number, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await PermissionDAL.getDataByIdByView(id, transaction);
    },

    create: async (data: PermissionCreationAttributes, transaction?: Transaction) => {
        return await PermissionDAL.CreateData(data, transaction);
    },

    update: async (id: number, data: Partial<PermissionAttributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await PermissionService.getById(id, transaction);
        if (!existingRecord) throw new Error("Permission not found");
        
        return await PermissionDAL.UpdateData(id, data, transaction);
    },

    delete: async (id: number, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await PermissionService.getById(id, transaction);
        if (!existingRecord) throw new Error("Permission not found");

        return await PermissionDAL.deleteDataById(id, req, res, transaction);
    },
    getPermissionLastestByDesc:async()=>{
      return await PermissionDAL.getPermissionByDescByOnlyOne()
    }
};

export default PermissionService;
