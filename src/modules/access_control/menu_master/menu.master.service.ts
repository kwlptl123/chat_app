import { Request, Response } from "express";
import MenuMasterDAL from "./menu.master.data.layer.js";
import { MenuMasterCreationAttributes, MenuMasterAttributes } from "./menu.master.model.js";

const MenuMasterService = {
    getAll: async () => {
        return await MenuMasterDAL.getAllDataByView();
    },

    getById: async (id: number) => {
        const data = await MenuMasterDAL.getDataByIdByView(id);
        if (!data) throw new Error("MenuMaster not found");
        return data;
    },

    create: async (data: MenuMasterCreationAttributes) => {
        return await MenuMasterDAL.CreateData(data);
    },

    update: async (id: number, data: Partial<MenuMasterAttributes>) => {
        await MenuMasterService.getById(id);
        return await MenuMasterDAL.UpdateData(id, data);
    },

    delete: async (id: number, req: Request, res: Response) => {
        await MenuMasterService.getById(id);
        return await MenuMasterDAL.deleteDataById(id, req, res);
    }
};

export default MenuMasterService;
