"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const RubricTemplate = sequelize.define(
    "RubricTemplate",
    {
      rubricTemplateId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "rubricTemplateId",
      },
      templateName: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      assignmentType: {
        type: DataTypes.STRING(50),
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      tableName: "RubricTemplates",
      timestamps: true,
      indexes: [
        { fields: ["isActive"] },
        { fields: ["assignmentType"] },
        { fields: ["isDefault"] },
      ],
    }
  );

  RubricTemplate.associate = (models) => {
    RubricTemplate.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });
    RubricTemplate.belongsTo(models.User, {
      foreignKey: "updatedBy",
      as: "updater",
    });
    RubricTemplate.hasMany(models.RubricCriteria, {
      foreignKey: "rubricTemplateId",
      as: "criteria",
    });
  };

  return RubricTemplate;
};