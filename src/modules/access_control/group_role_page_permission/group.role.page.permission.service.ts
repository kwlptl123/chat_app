import { Request, Response } from "express";
import { Transaction } from "sequelize";
import GroupRolePagePermissionDAL from "./group.role.page.permission.data.layer.js";
import { GroupRolePagePermissionCreationAttributes, GroupRolePagePermissionAttributes } from "./group.role.page.permission.model.js";

const GroupRolePagePermissionService = {
    getAll: async (transaction?: Transaction) => {
        return await GroupRolePagePermissionDAL.getAllDataByView(transaction);
    },

    getById: async (id: number, transaction?: Transaction) => {
        // Simply return the data or null, leaving validation to the caller
        return await GroupRolePagePermissionDAL.getDataByIdByView(id, transaction);
    },

    create: async (data: GroupRolePagePermissionCreationAttributes, transaction?: Transaction) => {
        return await GroupRolePagePermissionDAL.CreateData(data, transaction);
    },

    update: async (id: number, data: Partial<GroupRolePagePermissionAttributes>, transaction?: Transaction) => {
        // Validate existence before updating
        const existingRecord = await GroupRolePagePermissionService.getById(id, transaction);
        if (!existingRecord) throw new Error("GroupRolePagePermission not found");
        
        return await GroupRolePagePermissionDAL.UpdateData(id, data, transaction);
    },

    delete: async (id: number, req: Request, res: Response, transaction?: Transaction) => {
        // Validate existence before deleting
        const existingRecord = await GroupRolePagePermissionService.getById(id, transaction);
        if (!existingRecord) throw new Error("GroupRolePagePermission not found");

        return await GroupRolePagePermissionDAL.deleteDataById(id, req, res, transaction);
    },
    getDataByRoleIdAndPageId:async(role_id:number,page_id:number)=>{
        return await GroupRolePagePermissionDAL.getDataByRoleIdAndPageId(role_id,page_id)
    },
    getDataByRoleId:async(role_id:number)=>{
    try{
      return await GroupRolePagePermissionDAL.getDataByRoleId(role_id)
    }catch(error){
      throw error
    }
  },
};

export default GroupRolePagePermissionService;
