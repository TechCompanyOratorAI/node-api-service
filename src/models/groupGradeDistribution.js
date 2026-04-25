'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupGradeDistribution extends Model {
    static associate(models) {
      GroupGradeDistribution.belongsTo(models.Group, {
        foreignKey: 'groupId',
        as: 'group'
      });
      GroupGradeDistribution.belongsTo(models.AIReport, {
        foreignKey: 'reportId',
        as: 'report'
      });
      GroupGradeDistribution.belongsTo(models.User, {
        foreignKey: 'leaderStudentId',
        as: 'leader'
      });
      GroupGradeDistribution.hasMany(models.GroupGradeMember, {
        foreignKey: 'distributionId',
        as: 'members'
      });
    }
  }

  GroupGradeDistribution.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reportId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      leaderStudentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      instructorGrade: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      distributedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('submitted', 'reopened', 'finalized'),
        allowNull: false,
        defaultValue: 'submitted',
      },
      submittedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      finalizedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'GroupGradeDistribution',
      tableName: 'GroupGradeDistributions',
      timestamps: true,
      indexes: [
        { fields: ['groupId'] },
        { fields: ['reportId'] },
        { fields: ['leaderStudentId'] },
        { unique: true, fields: ['groupId', 'reportId'] },
      ],
    }
  );

  return GroupGradeDistribution;
};