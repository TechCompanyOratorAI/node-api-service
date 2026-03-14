'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding performance indexes for speech quality tables...');
    
    try {
      // Indexes for SpeechQualityAnalyses table
      await queryInterface.addIndex('SpeechQualityAnalyses', ['presentationId'], {
        name: 'idx_speech_quality_presentation_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('SpeechQualityAnalyses', ['jobId'], {
        name: 'idx_speech_quality_job_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('SpeechQualityAnalyses', ['analyzedAt'], {
        name: 'idx_speech_quality_analyzed_at',
        concurrently: true
      });
      
      // Composite index for common queries
      await queryInterface.addIndex('SpeechQualityAnalyses', ['presentationId', 'analyzedAt'], {
        name: 'idx_speech_quality_presentation_analyzed',
        concurrently: true
      });

      // Indexes for HesitationPatterns table
      await queryInterface.addIndex('HesitationPatterns', ['speechAnalysisId'], {
        name: 'idx_hesitation_speech_analysis_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('HesitationPatterns', ['segmentId'], {
        name: 'idx_hesitation_segment_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('HesitationPatterns', ['patternType'], {
        name: 'idx_hesitation_pattern_type',
        concurrently: true
      });
      
      await queryInterface.addIndex('HesitationPatterns', ['startTime', 'endTime'], {
        name: 'idx_hesitation_time_range',
        concurrently: true
      });
      
      // Composite index for filtering by speech analysis and pattern type
      await queryInterface.addIndex('HesitationPatterns', ['speechAnalysisId', 'patternType'], {
        name: 'idx_hesitation_analysis_type',
        concurrently: true
      });

      // Indexes for SegmentSpeechQuality table
      await queryInterface.addIndex('SegmentSpeechQuality', ['speechAnalysisId'], {
        name: 'idx_segment_quality_speech_analysis_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('SegmentSpeechQuality', ['segmentId'], {
        name: 'idx_segment_quality_segment_id',
        concurrently: true
      });
      
      // Composite index for the unique constraint (already exists but adding for performance)
      await queryInterface.addIndex('SegmentSpeechQuality', ['speechAnalysisId', 'segmentId'], {
        name: 'idx_segment_quality_analysis_segment',
        unique: true,
        concurrently: true
      });
      
      // Index for filtering by hesitation metrics
      await queryInterface.addIndex('SegmentSpeechQuality', ['hesitationRatio'], {
        name: 'idx_segment_quality_hesitation_ratio',
        concurrently: true
      });

      console.log('✅ All speech quality indexes created successfully');
      
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🗑️ Removing speech quality indexes...');
    
    try {
      // Remove indexes in reverse order
      const indexesToRemove = [
        'idx_segment_quality_hesitation_ratio',
        'idx_segment_quality_analysis_segment',
        'idx_segment_quality_segment_id',
        'idx_segment_quality_speech_analysis_id',
        'idx_hesitation_analysis_type',
        'idx_hesitation_time_range',
        'idx_hesitation_pattern_type',
        'idx_hesitation_segment_id',
        'idx_hesitation_speech_analysis_id',
        'idx_speech_quality_presentation_analyzed',
        'idx_speech_quality_analyzed_at',
        'idx_speech_quality_job_id',
        'idx_speech_quality_presentation_id'
      ];

      for (const indexName of indexesToRemove) {
        try {
          await queryInterface.removeIndex('SpeechQualityAnalyses', indexName);
        } catch (error) {
          // Index might not exist or be on different table
          try {
            await queryInterface.removeIndex('HesitationPatterns', indexName);
          } catch (error2) {
            try {
              await queryInterface.removeIndex('SegmentSpeechQuality', indexName);
            } catch (error3) {
              console.warn(`Could not remove index ${indexName}:`, error3.message);
            }
          }
        }
      }
      
      console.log('✅ Speech quality indexes removed successfully');
      
    } catch (error) {
      console.error('❌ Error removing indexes:', error);
      throw error;
    }
  }
};