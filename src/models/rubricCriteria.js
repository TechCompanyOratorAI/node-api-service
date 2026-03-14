"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const RubricCriteria = sequelize.define(
    "RubricCriteria",
    {
      criteriaId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "criteriaId",
      },
      rubricTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      criteriaName: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      criteriaDescription: {
        type: DataTypes.TEXT,
      },
      weight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1.0,
      },
      maxScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      evaluationGuide: {
        type: DataTypes.TEXT,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "RubricCriteria",
      timestamps: true,
      indexes: [
        { fields: ["rubricTemplateId"] },
        { fields: ["displayOrder"] },
        { fields: ["isActive"] },
      ],
    }
  );

  RubricCriteria.associate = (models) => {
    RubricCriteria.belongsTo(models.RubricTemplate, {
      foreignKey: "rubricTemplateId",
      as: "template",
    });
  };

  return RubricCriteria;
};