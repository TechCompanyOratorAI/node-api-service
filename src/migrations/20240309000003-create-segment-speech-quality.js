'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SegmentSpeechQuality', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      speechAnalysisId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'SpeechQualityAnalyses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      segmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'TranscriptSegments',
          key: 'segmentId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Segment-specific Speech Quality Scores
      segmentFluency: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      segmentClarity: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      segmentConfidence: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      
      // Segment Hesitation Metrics
      segmentHesitationCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      segmentHesitationTime: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total hesitation time in this segment (seconds)'
      },
      hesitationRatio: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 },
        comment: 'Hesitation time / segment duration'
      },
      
      // Segment Speech Metrics
      segmentSpeakingRate: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Speaking rate for this segment (syllables/min)'
      },
      segmentPitchMean: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Average pitch in this segment'
      },
      segmentEnergyMean: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
        comment: 'Average energy in this segment'
      },
      segmentSilenceRatio: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        validate: { min: 0, max: 1 },
        comment: 'Silence ratio in this segment'
      },
      
      // Segment Quality Issues and Suggestions
      qualityIssues: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Speech quality issues specific to this segment'
      },
      qualitySuggestions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Speech quality suggestions for this segment'
      },
      
      // Timing Information
      segmentStartTime: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true,
        comment: 'Segment start time in seconds'
      },
      segmentEndTime: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true,
        comment: 'Segment end time in seconds'
      },
      segmentDuration: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true,
        comment: 'Segment duration in seconds'
      },
      
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('SegmentSpeechQuality', ['speechAnalysisId']);
    await queryInterface.addIndex('SegmentSpeechQuality', ['segmentId']);
    await queryInterface.addIndex('SegmentSpeechQuality', ['segmentFluency']);
    await queryInterface.addIndex('SegmentSpeechQuality', ['segmentHesitationCount']);
    
    // Add unique constraint to prevent duplicates
    await queryInterface.addIndex('SegmentSpeechQuality', {
      fields: ['speechAnalysisId', 'segmentId'],
      unique: true,
      name: 'unique_analysis_segment'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SegmentSpeechQuality');
  }
};