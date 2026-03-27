"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define(
    "Class",
    {
      classId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      classCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "closed", "archived"),
        allowNull: false,
        defaultValue: "active",
      },
      startDate: {
        type: DataTypes.DATEONLY,
      },
      endDate: {
        type: DataTypes.DATEONLY,
      },
      maxStudents: {
        type: DataTypes.INTEGER,
      },
      maxGroupMembers: {
        type: DataTypes.INTEGER,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "Classes",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["courseId", "classCode"] },
        { fields: ["courseId"] },
        { fields: ["status"] },
      ],
    }
  );

  Class.associate = (models) => {
    Class.belongsTo(models.Course, {
      foreignKey: "courseId",
      as: "course",
    });
    Class.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });
    Class.belongsToMany(models.User, {
      through: models.ClassInstructor,
      foreignKey: "classId",
      otherKey: "instructorId",
      as: "instructors",
    });
    Class.hasMany(models.ClassInstructor, {
      foreignKey: "classId",
      as: "classInstructors",
    });
    Class.hasMany(models.EnrollKey, {
      foreignKey: "classId",
      as: "enrollKeys",
    });
    Class.hasMany(models.Enrollment, {
      foreignKey: "classId",
      as: "enrollments",
    });
    Class.hasMany(models.Presentation, {
      foreignKey: "classId",
      as: "presentations",
    });
    Class.hasMany(models.Group, {
      foreignKey: "classId",
      as: "groups",
    });
    Class.hasMany(models.Topic, {
      foreignKey: "classId",
      as: "topics",
    });
  };

  return Class;
};
