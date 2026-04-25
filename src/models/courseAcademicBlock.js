"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CourseAcademicBlock extends Model {
    static associate(models) {
      CourseAcademicBlock.belongsTo(models.Course, {
        foreignKey: "courseId",
        as: "course",
      });
      CourseAcademicBlock.belongsTo(models.AcademicBlock, {
        foreignKey: "academicBlockId",
        as: "academicBlock",
      });
    }
  }

  CourseAcademicBlock.init(
    {
      courseAcademicBlockId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      courseId: {
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
      modelName: "CourseAcademicBlock",
      tableName: "course_academic_blocks",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["courseId", "academicBlockId"] },
        { fields: ["courseId"] },
        { fields: ["academicBlockId"] },
      ],
    }
  );

  return CourseAcademicBlock;
};
