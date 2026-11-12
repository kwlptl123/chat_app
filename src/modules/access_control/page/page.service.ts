import { Request, Response } from "express";
import { Transaction } from "sequelize";
import PageDAL from "./page.data.layer.js";
import { PageCreationAttributes, PageAttributes } from "./page.model.js";

const PageService = {
    getAll: async (transaction?: Transaction) => {
        return await PageDAL.getAllDataByView(transaction);
    },

    getById: async (id: number, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await PageDAL.getDataByIdByView(id, transaction);
    },

    create: async (data: PageCreationAttributes, transaction?: Transaction) => {
        return await PageDAL.CreateData(data, transaction);
    },

    update: async (id: number, data: Partial<PageAttributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await PageService.getById(id, transaction);
        if (!existingRecord) throw new Error("Page not found");
        
        return await PageDAL.UpdateData(id, data, transaction);
    },

    delete: async (id: number, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await PageService.getById(id, transaction);
        if (!existingRecord) throw new Error("Page not found");

        return await PageDAL.deleteDataById(id, req, res, transaction);
    }
};

export default PageService;
