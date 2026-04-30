"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClassAcademicBlock extends Model {
    static associate(models) {
      ClassAcademicBlock.belongsTo(models.Class, {
        foreignKey: "classId",
        as: "class",
      });
      ClassAcademicBlock.belongsTo(models.AcademicBlock, {
        foreignKey: "academicBlockId",
        as: "academicBlock",
      });
    }
  }

  ClassAcademicBlock.init(
    {
      classAcademicBlockId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      academicBlockId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "ClassAcademicBlock",
      tableName: "class_academic_blocks",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["classId", "academicBlockId"] },
        { fields: ["classId"] },
        { fields: ["academicBlockId"] },
      ],
    }
  );

  return ClassAcademicBlock;
};
