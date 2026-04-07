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
      presentationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: "uq_ai_reports_submission",
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
          "pending",
          "waiting",
          "draft",
          "pending_review",
          "generating",
          "completed",
          "failed",
          "confirmed",
          "rejected"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      confirmedByInstructorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      feedbackOfInstructor: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      gradeForInstructor: {
        type: DataTypes.DECIMAL(5, 2),
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
        { fields: ["classAiSettingId"] },
        { fields: ["reportStatus"] },
        { fields: ["confirmedByInstructorId"] },
        { fields: ["generatedAt"] },
      ],
    }
  );

  AIReport.associate = (models) => {
    AIReport.belongsTo(models.Presentation, {
      foreignKey: "presentationId",
      as: "submission",
    });
    AIReport.belongsTo(models.Class, {
      foreignKey: "classId",
      as: "class",
    });
    AIReport.belongsTo(models.ClassAISetting, {
      foreignKey: "classAiSettingId",
      as: "classAiSetting",
    });
    AIReport.belongsTo(models.User, {
      foreignKey: "confirmedByInstructorId",
      as: "confirmer",
    });
    AIReport.hasMany(models.CriterionFeedback, {
      foreignKey: "reportId",
      as: "criterionFeedbacks",
    });
    AIReport.hasMany(models.Feedback, {
      foreignKey: "reportId",
      as: "instructorFeedback",
    });
  };

  return AIReport;
};