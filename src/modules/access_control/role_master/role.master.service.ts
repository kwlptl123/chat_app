import { Request, Response } from "express";
import RoleMasterDAL from "./role.master.data.layer.js";
import { RoleMasterCreationAttributes, RoleMasterAttributes } from "./role.master.model.js";

const RoleMasterService = {
    getAll: async () => {
        return await RoleMasterDAL.getAllDataByView();
    },

    getById: async (id: number) => {
        const data = await RoleMasterDAL.getDataByIdByView(id);
        if (!data) throw new Error("RoleMaster not found");
        return data;
    },

    create: async (data: RoleMasterCreationAttributes) => {
        return await RoleMasterDAL.CreateData(data);
    },

    update: async (id: number, data: Partial<RoleMasterAttributes>) => {
        await RoleMasterService.getById(id);
        return await RoleMasterDAL.UpdateData(id, data);
    },

    delete: async (id: number, req: Request, res: Response) => {
        await RoleMasterService.getById(id);
        return await RoleMasterDAL.deleteDataById(id, req, res);
    }
};

export default RoleMasterService;
