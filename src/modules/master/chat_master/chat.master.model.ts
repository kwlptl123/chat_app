import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface ChatMasterAttributes {
  chat_id?: number;
  chat_type: any;
  chat_name: string;
  direct_chat_key: string;
  is_active?: boolean;
  created_by?: number;
  created_at?: Date;
  modified_by?: number;
  modified_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;
}

export interface ChatMasterCreationAttributes extends Optional<ChatMasterAttributes, "chat_id"> {}

const ChatMasterModel = (sequelize: Sequelize) => {
  return sequelize.define<Model<ChatMasterAttributes, ChatMasterCreationAttributes>>(
    "chat_master",
    {
      chat_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      chat_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      chat_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      direct_chat_key: {
        type: DataTypes.STRING(50),
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
      tableName: "chat_master",
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

export default ChatMasterModel;
