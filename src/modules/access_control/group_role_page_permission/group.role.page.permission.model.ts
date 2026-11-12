import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface GroupRolePagePermissionAttributes {
  role_page_permission_id?: number;
  role_id: number;
  page_id: number;
  permission: number;
  description: string;
  ip_address: string;
  city_cordinates: string;
  is_active?: boolean;
  created_by?: number;
  created_at?: Date;
  modified_by?: number;
  modified_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;
}

export interface GroupRolePagePermissionCreationAttributes extends Optional<GroupRolePagePermissionAttributes, "role_page_permission_id"> {}

const GroupRolePagePermissionModel = (sequelize: Sequelize) => {
  return sequelize.define<Model<GroupRolePagePermissionAttributes, GroupRolePagePermissionCreationAttributes>>(
    "group_role_page_permission",
    {
      role_page_permission_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      page_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      permission: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      city_cordinates: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      modified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      modified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deleted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      }
    },
    {
      tableName: "group_role_page_permission",
      paranoid: true,
      timestamps: false,
      defaultScope: {
        attributes: {
          exclude: [
            "created_by",
            "modified_by",
            "deleted_by",
            "deleted_at",
            "is_active",
            "created_at",
            "modified_at",
          ],
        },
      },
    }
  );
};

export default GroupRolePagePermissionModel;
