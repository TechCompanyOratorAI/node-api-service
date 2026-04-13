'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupGradeMember extends Model {
    static associate(models) {
      GroupGradeMember.belongsTo(models.GroupGradeDistribution, {
        foreignKey: 'distributionId',
        as: 'distribution'
      });
      GroupGradeMember.belongsTo(models.User, {
        foreignKey: 'studentId',
        as: 'student'
      });
    }
  }

  GroupGradeMember.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      distributionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      receivedGrade: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'GroupGradeMember',
      tableName: 'GroupGradeMembers',
      timestamps: true,
      indexes: [
        { fields: ['distributionId'] },
        { fields: ['studentId'] },
        { unique: true, fields: ['distributionId', 'studentId'] },
      ],
    }
  );

  return GroupGradeMember;
};