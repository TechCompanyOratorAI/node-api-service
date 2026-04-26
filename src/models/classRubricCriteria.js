"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const ClassRubricCriteria = sequelize.define(
    "ClassRubricCriteria",
    {
      classRubricCriteriaId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "classRubricCriteriaId",
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      rubricTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sourceCriteriaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      criteriaName: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      criteriaDescription: {
        type: DataTypes.TEXT,
      },
      weight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      maxScore: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 10.0,
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      isActive: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
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
      tableName: "ClassRubricCriteria",
      timestamps: true,
      indexes: [
        { fields: ["classId"] },
        { fields: ["rubricTemplateId"] },
        { fields: ["sourceCriteriaId"] },
        { fields: ["isActive"] },
        { fields: ["classId", "displayOrder"] },
      ],
    }
  );

  ClassRubricCriteria.associate = (models) => {
    ClassRubricCriteria.belongsTo(models.Class, {
      foreignKey: "classId",
      as: "class",
    });
    ClassRubricCriteria.belongsTo(models.RubricTemplate, {
      foreignKey: "rubricTemplateId",
      as: "rubricTemplate",
    });
    ClassRubricCriteria.belongsTo(models.RubricCriteria, {
      foreignKey: "sourceCriteriaId",
      as: "sourceCriteria",
    });
    ClassRubricCriteria.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });
    ClassRubricCriteria.belongsTo(models.User, {
      foreignKey: "updatedBy",
      as: "updater",
    });
  };

  return ClassRubricCriteria;
};