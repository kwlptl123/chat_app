import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface MenuMasterAttributes {
  menu_id?: number;
  menu: string;
  is_active?: boolean;
  created_by?: number;
  created_at?: Date;
  modified_by?: number;
  modified_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;
}

export interface MenuMasterCreationAttributes extends Optional<MenuMasterAttributes, "menu_id"> {}

const MenuMasterModel = (sequelize: Sequelize) => {
  return sequelize.define<Model<MenuMasterAttributes, MenuMasterCreationAttributes>>(
    "menu_master",
    {
      menu_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      menu: {
        type: DataTypes.STRING(10000),
        allowNull: false,
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
      tableName: "menu_master",
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

export default MenuMasterModel;
