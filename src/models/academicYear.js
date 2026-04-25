"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AcademicYear extends Model {
    static associate(models) {
      AcademicYear.hasMany(models.AcademicBlock, {
        foreignKey: "academicYearId",
        as: "blocks",
      });
    }
  }

  AcademicYear.init(
    {
      academicYearId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "AcademicYear",
      tableName: "academic_years",
      indexes: [
        { unique: true, fields: ["year"] },
        { fields: ["isActive"] },
      ],
    }
  );

  return AcademicYear;
};
