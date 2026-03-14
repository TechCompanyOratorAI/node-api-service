'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SpeechQualityAnalyses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      presentationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Presentations',
          key: 'presentationId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      jobId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Jobs',
          key: 'jobId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      
      // Overall Speech Quality Scores (0-1)
      fluencyScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      clarityScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      confidenceScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      overallScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      
      // Speech Metrics
      speakingRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Syllables per minute'
      },
      pitchMean: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Average pitch in Hz'
      },
      pitchStd: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Pitch standard deviation'
      },
      energyMean: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Average energy level'
      },
      energyStd: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Energy standard deviation'
      },
      pitchVariation: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      volumeVariation: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      speechRhythmScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      silenceRatio: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      voicedRatio: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0, max: 1 }
      },
      spectralCentroidMean: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Average spectral centroid'
      },
      
      // Hesitation Statistics
      totalHesitationCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalHesitationTime: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total hesitation time in seconds'
      },
      hesitationRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Hesitations per minute'
      },
      
      // Audio File Information
      audioDuration: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Audio duration in seconds'
      },
      audioFileSize: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Audio file size in bytes'
      },
      audioFilename: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      
      // Processing Information
      opensmileConfig: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'eGeMAPSv02'
      },
      sampleRate: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 16000
      },
      processingTime: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Processing time in seconds'
      },
      
      // MFCC Features (JSON array)
      mfccFeatures: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'MFCC feature coefficients'
      },
      
      // Analysis timestamp
      analyzedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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
    await queryInterface.addIndex('SpeechQualityAnalyses', ['presentationId']);
    await queryInterface.addIndex('SpeechQualityAnalyses', ['jobId']);
    await queryInterface.addIndex('SpeechQualityAnalyses', ['analyzedAt']);
    await queryInterface.addIndex('SpeechQualityAnalyses', ['overallScore']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SpeechQualityAnalyses');
  }
};