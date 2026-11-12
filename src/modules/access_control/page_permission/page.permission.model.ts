import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface PagePermissionAttributes {
  page_permission_id?: number;
  page_id: number;
  permission_id: number;
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

export interface PagePermissionCreationAttributes extends Optional<PagePermissionAttributes, "page_permission_id"> {}

const PagePermissionModel = (sequelize: Sequelize) => {
  return sequelize.define<Model<PagePermissionAttributes, PagePermissionCreationAttributes>>(
    "page_permission",
    {
      page_permission_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      page_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      permission_id: {
        type: DataTypes.INTEGER,
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
      tableName: "page_permission",
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

export default PagePermissionModel;
