"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const ClassAISetting = sequelize.define(
    "ClassAISetting",
    {
      classAiSettingId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "classAiSettingId",
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: "uq_class_ai_settings_class",
      },
      configId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rubricTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      enableAiReport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      requireInstructorConfirmation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      allowInstructorEdit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      enableSlideLayoutScoring: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      slideLayoutWeight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.1,
      },
      feedbackLanguage: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "en",
      },
      reportFormat: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "detailed",
      },
      includeCriterionComments: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      includeOverallSummary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      includeSuggestions: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "ClassAISettings",
      timestamps: true,
      indexes: [
        { fields: ["configId"] },
        { fields: ["rubricTemplateId"] },
        { fields: ["isActive"] },
      ],
    }
  );

  ClassAISetting.associate = (models) => {
    ClassAISetting.belongsTo(models.Class, {
      foreignKey: "classId",
      as: "class",
    });
    ClassAISetting.belongsTo(models.AIConfig, {
      foreignKey: "configId",
      as: "aiConfig",
    });
    ClassAISetting.belongsTo(models.RubricTemplate, {
      foreignKey: "rubricTemplateId",
      as: "rubricTemplate",
    });
    ClassAISetting.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });
    ClassAISetting.belongsTo(models.User, {
      foreignKey: "updatedBy",
      as: "updater",
    });
  };

  return ClassAISetting;
};