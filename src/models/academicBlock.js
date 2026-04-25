"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AcademicBlock extends Model {
    static associate(models) {
      AcademicBlock.belongsTo(models.AcademicYear, {
        foreignKey: "academicYearId",
        as: "academicYear",
      });
      AcademicBlock.hasMany(models.Course, {
        foreignKey: "academicBlockId",
        as: "courses",
      });
      AcademicBlock.belongsToMany(models.Course, {
        through: models.CourseAcademicBlock,
        foreignKey: "academicBlockId",
        otherKey: "courseId",
        as: "mappedCourses",
      });
      AcademicBlock.hasMany(models.CourseAcademicBlock, {
        foreignKey: "academicBlockId",
        as: "courseAcademicBlocks",
      });
      AcademicBlock.hasMany(models.Class, {
        foreignKey: "academicBlockId",
        as: "classes",
      });
    }
  }

  AcademicBlock.init(
    {
      academicBlockId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      academicYearId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      blockCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      term: {
        type: DataTypes.ENUM("SPRING", "SUMMER", "FALL"),
        allowNull: false,
      },
      half: {
        type: DataTypes.ENUM("H1", "H2"),
        allowNull: true,
      },
      blockType: {
        type: DataTypes.ENUM("NORMAL", "BLOCK3"),
        allowNull: false,
        defaultValue: "NORMAL",
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      handoverStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      handoverEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "AcademicBlock",
      tableName: "academic_blocks",
      indexes: [
        { unique: true, fields: ["blockCode"] },
        { fields: ["academicYearId"] },
        { fields: ["term"] },
        { fields: ["blockType"] },
        { fields: ["startDate", "endDate"] },
        { fields: ["isActive"] },
      ],
    }
  );

  return AcademicBlock;
};
