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
      
      // Segment-specific Speech Quality Scores
      segmentFluency: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      segmentClarity: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      segmentConfidence: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 }
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
      
      // Segment Speech Metrics
      segmentSpeakingRate: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Speaking rate for this segment (syllables/min)'
      },
      segmentPitchMean: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Average pitch in this segment'
      },
      segmentEnergyMean: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
        comment: 'Average energy in this segment'
      },
      segmentSilenceRatio: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 },
        comment: 'Silence ratio in this segment'
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
      
      // Timing Information
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