'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Presentation extends Model {
    static associate(models) {
      Presentation.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' });
      Presentation.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
      Presentation.belongsTo(models.Topic, { foreignKey: 'topicId', as: 'topic' });

      Presentation.hasOne(models.AudioRecord, { foreignKey: 'presentationId', as: 'audioRecord' });
      Presentation.hasMany(models.Slide, { foreignKey: 'presentationId', as: 'slides' });

      Presentation.hasOne(models.AnalysisResult, { foreignKey: 'presentationId', as: 'analysisResult' });
      Presentation.hasMany(models.Feedback, { foreignKey: 'presentationId', as: 'feedbacks' });
      Presentation.hasMany(models.PresentationAccess, { foreignKey: 'presentationId', as: 'accesses' });

      Presentation.hasOne(models.Transcript, { foreignKey: 'presentationId', as: 'transcript' });

      Presentation.hasMany(models.Job, { foreignKey: 'presentationId', as: 'jobs' });
      Presentation.hasMany(models.Speaker, { foreignKey: 'presentationId', as: 'speakers' });
    }
  }

  Presentation.init(
    {
      presentationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      studentId: { type: DataTypes.INTEGER, allowNull: false },
      courseId: { type: DataTypes.INTEGER, allowNull: false },
      topicId: { type: DataTypes.INTEGER, allowNull: false },
      groupCode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT },
      submissionDate: { type: DataTypes.DATE },

      status: {
        type: DataTypes.ENUM('draft', 'submitted', 'processing', 'done', 'failed'),
        allowNull: false,
        defaultValue: 'draft',
      },

      durationSeconds: { type: DataTypes.INTEGER },

      visibility: {
        type: DataTypes.ENUM('private', 'course', 'shared', 'public'),
        allowNull: false,
        defaultValue: 'private',
      },

      versionNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      sequelize,
      modelName: 'Presentation',
      tableName: 'Presentations',
    }
  );

  return Presentation;
};
