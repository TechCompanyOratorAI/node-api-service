'use strict';
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
      academicBlockId: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      // Cho phép sinh viên upload presentation
      isUploadEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // Ngày bắt đầu cho phép upload (optional - để set thời gian cụ thể)
      uploadStartDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Ngày kết thúc cho phép upload (optional)
      uploadEndDate: {
        type: DataTypes.DATE,
        allowNull: true,
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
    Class.belongsTo(models.AcademicBlock, {
      foreignKey: "academicBlockId",
      as: "academicBlock",
    });
    Class.belongsToMany(models.AcademicBlock, {
      through: models.ClassAcademicBlock,
      foreignKey: "classId",
      otherKey: "academicBlockId",
      as: "academicBlocks",
    });
    Class.hasMany(models.ClassAcademicBlock, {
      foreignKey: "classId",
      as: "classAcademicBlocks",
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
    Class.hasMany(models.ClassEmailWhitelist, {
      foreignKey: "classId",
      as: "emailWhitelists",
    });
  };

  return Class;
};
