import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface NotificationMasterAttributes {
  notification_id?: number;
  user_id: number;
  sender_id: number;
  chat_id: number;
  firebase_message_id: string;
  notification_type: any;
  title: string;
  body: string;
  is_read: boolean;
  read_at: Date;
  is_active?: boolean;
  created_by?: number;
  created_at?: Date;
  modified_by?: number;
  modified_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;
}

export interface NotificationMasterCreationAttributes extends Optional<NotificationMasterAttributes, "notification_id"> {}

const NotificationMasterModel = (sequelize: Sequelize) => {
  return sequelize.define<Model<NotificationMasterAttributes, NotificationMasterCreationAttributes>>(
    "notification_master",
    {
      notification_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      chat_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      firebase_message_id: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      notification_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      read_at: {
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
      tableName: "notification_master",
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

export default NotificationMasterModel;
