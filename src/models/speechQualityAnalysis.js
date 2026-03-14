'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SpeechQualityAnalysis extends Model {
    static associate(models) {
      // Belongs to presentation
      SpeechQualityAnalysis.belongsTo(models.Presentation, {
        foreignKey: 'presentationId',
        as: 'presentation'
      });
      
      // Belongs to job (optional)
      SpeechQualityAnalysis.belongsTo(models.Job, {
        foreignKey: 'jobId',
        as: 'job'
      });
      
      // Has many hesitation patterns
      SpeechQualityAnalysis.hasMany(models.HesitationPattern, {
        foreignKey: 'speechAnalysisId',
        as: 'hesitationPatterns'
      });
      
      // Has many segment speech quality records
      SpeechQualityAnalysis.hasMany(models.SegmentSpeechQuality, {
        foreignKey: 'speechAnalysisId',
        as: 'segmentQualities'
      });
    }
  }

  SpeechQualityAnalysis.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      presentationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      jobId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      
      // Overall Speech Quality Scores (0-1)
      fluencyScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      clarityScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      confidenceScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      overallScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      
      // Speech Metrics
      speakingRate: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Syllables per minute'
      },
      pitchMean: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Average pitch in Hz'
      },
      pitchStd: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Pitch standard deviation'
      },
      energyMean: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Average energy level'
      },
      energyStd: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Energy standard deviation'
      },
      pitchVariation: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      volumeVariation: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      speechRhythmScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      silenceRatio: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      voicedRatio: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      spectralCentroidMean: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Average spectral centroid'
      },
      
      // Hesitation Statistics
      totalHesitationCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalHesitationTime: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total hesitation time in seconds'
      },
      hesitationRate: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Hesitations per minute'
      },
      
      // Audio File Information
      audioDuration: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Audio duration in seconds'
      },
      audioFileSize: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Audio file size in bytes'
      },
      audioFilename: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      // Processing Information
      opensmileConfig: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'eGeMAPSv02'
      },
      sampleRate: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 16000
      },
      processingTime: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Processing time in seconds'
      },
      
      // MFCC Features (JSON array)
      mfccFeatures: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'MFCC feature coefficients'
      },
      
      // Analysis timestamp
      analyzedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'SpeechQualityAnalysis',
      tableName: 'SpeechQualityAnalyses',
      timestamps: true, // createdAt, updatedAt
      indexes: [
        {
          fields: ['presentationId']
        },
        {
          fields: ['jobId']
        },
        {
          fields: ['analyzedAt']
        },
        {
          fields: ['overallScore']
        }
      ]
    }
  );

  return SpeechQualityAnalysis;
};