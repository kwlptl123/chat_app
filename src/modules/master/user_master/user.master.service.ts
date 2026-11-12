import { Request, Response } from "express";
import UserMasterDAL from "./user.master.data.layer.js";
import { UserMasterCreationAttributes, UserMasterAttributes } from "./user.master.model.js";

const UserMasterService = {
    getAll: async () => {
        return await UserMasterDAL.getAllDataByView();
    },

    getById: async (id: number) => {
        const data = await UserMasterDAL.getDataByIdByView(id);
        if (!data) throw new Error("UserMaster not found");
        return data;
    },

    create: async (data: UserMasterCreationAttributes) => {
        return await UserMasterDAL.CreateData(data);
    },

    update: async (id: number, data: Partial<UserMasterAttributes>) => {
        await UserMasterService.getById(id);
        return await UserMasterDAL.UpdateData(id, data);
    },

    delete: async (id: number, req: Request, res: Response) => {
        await UserMasterService.getById(id);
        return await UserMasterDAL.deleteDataById(id, req, res);
    },
    getByUserName: async (user_name: string) => {
        return await UserMasterDAL.getUserByUserName(user_name);
    },

    getByEmail: async (email: string) => {
        return await UserMasterDAL.getUserByEmail(email);
    },

    getByEmployeeNumber: async (emp_number: string) => {
        return await UserMasterDAL.getByEmployeeNumberByView(emp_number);
    },

    getByRoleId: async (role_id: number) => {
        return await UserMasterDAL.getUserDataByRoleIdByView(role_id);
    },

    getAdminsAndOperatorsForMail: async () => {
        return await UserMasterDAL.getUserDataOfAdminAndOperatorForMail();
    }
};

export default UserMasterService;
