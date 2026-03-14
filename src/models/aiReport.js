"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const AIReport = sequelize.define(
    "AIReport",
    {
      reportId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "reportId",
      },
      submissionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: "uq_ai_reports_submission",
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      configId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rubricTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      classAiSettingId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      overallScore: {
        type: DataTypes.DECIMAL(5, 2),
      },
      criterionScores: {
        type: DataTypes.JSON,
      },
      reportContent: {
        type: DataTypes.TEXT,
      },
      reportStatus: {
        type: DataTypes.ENUM(
          "draft",
          "pending_review",
          "generating",
          "completed",
          "failed",
          "confirmed",
          "rejected"
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      confirmedByInstructorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      confirmedAt: {
        type: DataTypes.DATE,
      },
      generatedByModel: {
        type: DataTypes.STRING(100),
      },
      generatedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "AIReports",
      timestamps: true,
      indexes: [
        { fields: ["classId"] },
        { fields: ["configId"] },
        { fields: ["rubricTemplateId"] },
        { fields: ["classAiSettingId"] },
        { fields: ["reportStatus"] },
        { fields: ["confirmedByInstructorId"] },
        { fields: ["generatedAt"] },
      ],
    }
  );

  AIReport.associate = (models) => {
    AIReport.belongsTo(models.Presentation, {
      foreignKey: "submissionId",
      as: "submission",
    });
    AIReport.belongsTo(models.Class, {
      foreignKey: "classId",
      as: "class",
    });
    AIReport.belongsTo(models.AIConfig, {
      foreignKey: "configId",
      as: "aiConfig",
    });
    AIReport.belongsTo(models.RubricTemplate, {
      foreignKey: "rubricTemplateId",
      as: "rubricTemplate",
    });
    AIReport.belongsTo(models.ClassAISetting, {
      foreignKey: "classAiSettingId",
      as: "classAiSetting",
    });
    AIReport.belongsTo(models.User, {
      foreignKey: "confirmedByInstructorId",
      as: "confirmer",
    });
  };

  return AIReport;
};