"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const CriterionFeedback = sequelize.define(
    "CriterionFeedback",
    {
      criterionFeedbackId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "criterionFeedbackId",
      },
      reportId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      classRubricCriteriaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "classRubricCriteriaId",
      },
      instructorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      score: {
        type: DataTypes.DECIMAL(5, 2),
      },
      comment: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: "CriterionFeedback",
      timestamps: true,
      indexes: [
        { fields: ["reportId"] },
        { fields: ["classRubricCriteriaId"] },
        { fields: ["instructorId"] },
        {
          unique: true,
          fields: ["reportId", "classRubricCriteriaId"],
          name: "uq_criterion_feedback_report_criteria",
        },
      ],
      uniqueKeys: {
        report_criteria_unique: {
          fields: ["reportId", "classRubricCriteriaId"],
        },
      },
    }
  );

  CriterionFeedback.associate = (models) => {
    CriterionFeedback.belongsTo(models.AIReport, {
      foreignKey: "reportId",
      as: "aiReport",
    });
    CriterionFeedback.belongsTo(models.ClassRubricCriteria, {
      foreignKey: "classRubricCriteriaId",
      as: "classRubricCriteria",
    });
    CriterionFeedback.belongsTo(models.User, {
      foreignKey: "instructorId",
      as: "instructor",
    });
  };

  return CriterionFeedback;
};
