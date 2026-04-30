"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, {
        foreignKey: "actorUserId",
        as: "actor",
      });
    }
  }

  AuditLog.init(
    {
      auditLogId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      actorUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actorRole: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      entityId: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("success", "failure"),
        allowNull: false,
        defaultValue: "success",
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      requestId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "AuditLog",
      tableName: "audit_logs",
      updatedAt: false,
      indexes: [
        { fields: ["actorUserId"] },
        { fields: ["action"] },
        { fields: ["entityType", "entityId"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return AuditLog;
};
