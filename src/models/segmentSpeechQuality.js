'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SegmentSpeechQuality extends Model {
    static associate(models) {
      // Belongs to speech quality analysis
      SegmentSpeechQuality.belongsTo(models.SpeechQualityAnalysis, {
        foreignKey: 'speechAnalysisId',
        as: 'speechAnalysis'
      });
      
      // Belongs to transcript segment
      SegmentSpeechQuality.belongsTo(models.TranscriptSegment, {
        foreignKey: 'segmentId',
        as: 'segment'
      });
    }
  }

  SegmentSpeechQuality.init(
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
        allowNull: false,
      },

      // Segment Hesitation Metrics
      segmentHesitationCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      segmentHesitationTime: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total hesitation time in this segment (seconds)'
      },
      hesitationRatio: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 },
        comment: 'Hesitation time / segment duration'
      },

      // Segment Quality Issues and Suggestions
      qualityIssues: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Speech quality issues specific to this segment'
      },
      qualitySuggestions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Speech quality suggestions for this segment'
      },

      // Timing Information (from TranscriptSegments)
      segmentStartTime: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: true,
        comment: 'Segment start time in seconds'
      },
      segmentEndTime: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: true,
        comment: 'Segment end time in seconds'
      },
      segmentDuration: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: true,
        comment: 'Segment duration in seconds'
      },

      // Removed unused fields: segmentFluency, segmentClarity, segmentConfidence,
      // segmentSpeakingRate, segmentPitchMean, segmentEnergyMean, segmentSilenceRatio
    },
    {
      sequelize,
      modelName: 'SegmentSpeechQuality',
      tableName: 'SegmentSpeechQuality',
      timestamps: true,
      indexes: [
        {
          fields: ['speechAnalysisId']
        },
        {
          fields: ['segmentId']
        },
        {
          fields: ['segmentFluency']
        },
        {
          fields: ['segmentHesitationCount']
        },
        {
          // Unique constraint to prevent duplicates
          unique: true,
          fields: ['speechAnalysisId', 'segmentId']
        }
      ]
    }
  );

  return SegmentSpeechQuality;
};