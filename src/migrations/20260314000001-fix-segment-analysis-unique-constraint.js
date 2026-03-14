'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the old unique constraint that includes slideId
    try {
      await queryInterface.removeConstraint('SegmentAnalyses', 'uq_segment_slide_unique');
      console.log('✅ Removed old unique constraint uq_segment_slide_unique');
    } catch (error) {
      console.log('⚠️ Old constraint may not exist:', error.message);
    }

    // Add new unique constraint only on segmentId
    // This allows multiple analyses for the same segment with different slides
    await queryInterface.addConstraint('SegmentAnalyses', {
      fields: ['segmentId'],
      type: 'unique',
      name: 'uq_segment_analysis_unique'
    });
    
    console.log('✅ Added new unique constraint on segmentId only');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new constraint
    await queryInterface.removeConstraint('SegmentAnalyses', 'uq_segment_analysis_unique');
    
    // Restore the old constraint
    await queryInterface.addConstraint('SegmentAnalyses', {
      fields: ['segmentId', 'slideId'],
      type: 'unique',
      name: 'uq_segment_slide_unique'
    });
  }
};