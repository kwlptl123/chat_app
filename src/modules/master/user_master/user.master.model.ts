import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface UserMasterAttributes {
  user_id?: number;
  user_name: string;
  password: string;
  email: string;
  role_id: number;
  emp_number?: string;
  otp?: number | null;
  otp_time?: Date | null;
  password_expiry_date?: Date | null;
  is_active?: boolean;
  created_by?: number;
  created_at?: Date;
  modified_by?: number;
  modified_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;
}

export interface UserMasterCreationAttributes extends Optional<UserMasterAttributes, "user_id"> {}

const UserMasterModel = (sequelize: Sequelize) => {
  return sequelize.define<Model<UserMasterAttributes, UserMasterCreationAttributes>>(
    "user_master",
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      emp_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      otp: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      otp_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      password_expiry_date: {
        type: DataTypes.DATE,
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
      tableName: "user_master",
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

export default UserMasterModel;
