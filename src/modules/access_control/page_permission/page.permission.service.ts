import { Request, Response } from "express";
import { Transaction } from "sequelize";
import PagePermissionDAL from "./page.permission.data.layer.js";
import { PagePermissionCreationAttributes, PagePermissionAttributes } from "./page.permission.model.js";

const PagePermissionService = {
    getAll: async (transaction?: Transaction) => {
        return await PagePermissionDAL.getAllDataByView(transaction);
    },

    getById: async (id: number, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await PagePermissionDAL.getDataByIdByView(id, transaction);
    },

    create: async (data: PagePermissionCreationAttributes, transaction?: Transaction) => {
        return await PagePermissionDAL.CreateData(data, transaction);
    },

    update: async (id: number, data: Partial<PagePermissionAttributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await PagePermissionService.getById(id, transaction);
        if (!existingRecord) throw new Error("PagePermission not found");
        
        return await PagePermissionDAL.UpdateData(id, data, transaction);
    },

    delete: async (id: number, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await PagePermissionService.getById(id, transaction);
        if (!existingRecord) throw new Error("PagePermission not found");

        return await PagePermissionDAL.deleteDataById(id, req, res, transaction);
    },
    getByPageId :async(page_id:number)=>{
        return await PagePermissionDAL.getByPageId(page_id)
    },
    getByPageAndPermission:async(page_id:number,permission_id:number)=>{
        return await PagePermissionDAL.getByPageAndPermission(page_id,permission_id)
    }
};

export default PagePermissionService;
