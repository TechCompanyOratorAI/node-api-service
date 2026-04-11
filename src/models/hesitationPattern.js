'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HesitationPattern extends Model {
    static associate(models) {
      // Belongs to speech quality analysis
      HesitationPattern.belongsTo(models.SpeechQualityAnalysis, {
        foreignKey: 'speechAnalysisId',
        as: 'speechAnalysis'
      });
      
      // Belongs to transcript segment (optional)
      HesitationPattern.belongsTo(models.TranscriptSegment, {
        foreignKey: 'segmentId',
        as: 'segment'
      });
    }
  }

  HesitationPattern.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      speechAnalysisId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      segmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Associated transcript segment (if applicable)'
      },
      
      // Hesitation Timing
      startTime: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: false,
        comment: 'Start time in seconds'
      },
      endTime: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: false,
        comment: 'End time in seconds'
      },
      duration: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: false,
        comment: 'Duration in seconds'
      },
      
      // Hesitation Classification
      patternType: {
        type: DataTypes.ENUM('silence', 'filler', 'repetition'),
        allowNull: false,
      },
      confidence: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
        validate: { min: 0, max: 1 },
        comment: 'Detection confidence score'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable description'
      },
      
      // Context Information
      segmentText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Associated segment text'
      },

      // Removed unused fields: beforeContext, afterContext, spectralComplexity, energyLevel

    },
    {
      sequelize,
      modelName: 'HesitationPattern',
      tableName: 'HesitationPatterns',
      timestamps: true,
      indexes: [
        {
          fields: ['speechAnalysisId']
        },
        {
          fields: ['segmentId']
        },
        {
          fields: ['startTime']
        },
        {
          fields: ['patternType']
        },
        {
          fields: ['confidence']
        }
      ]
    }
  );

  return HesitationPattern;
};