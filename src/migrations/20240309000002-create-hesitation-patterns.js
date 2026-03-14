'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HesitationPatterns', {
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
        allowNull: true,
        references: {
          model: 'TranscriptSegments',
          key: 'segmentId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Associated transcript segment (if applicable)'
      },
      
      // Hesitation Timing
      startTime: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: false,
        comment: 'Start time in seconds'
      },
      endTime: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: false,
        comment: 'End time in seconds'
      },
      duration: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: false,
        comment: 'Duration in seconds'
      },
      
      // Hesitation Classification
      patternType: {
        type: Sequelize.ENUM('silence', 'filler', 'repetition'),
        allowNull: false,
      },
      confidence: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        validate: { min: 0, max: 1 },
        comment: 'Detection confidence score'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human-readable description'
      },
      
      // Context Information
      segmentText: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Associated segment text'
      },
      beforeContext: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Text before hesitation'
      },
      afterContext: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Text after hesitation'
      },
      
      // Additional Metrics
      spectralComplexity: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Spectral complexity score for filler detection'
      },
      energyLevel: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Energy level during hesitation'
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
    await queryInterface.addIndex('HesitationPatterns', ['speechAnalysisId']);
    await queryInterface.addIndex('HesitationPatterns', ['segmentId']);
    await queryInterface.addIndex('HesitationPatterns', ['startTime']);
    await queryInterface.addIndex('HesitationPatterns', ['patternType']);
    await queryInterface.addIndex('HesitationPatterns', ['confidence']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('HesitationPatterns');
  }
};