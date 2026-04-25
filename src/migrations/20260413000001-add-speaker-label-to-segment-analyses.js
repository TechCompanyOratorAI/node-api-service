'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('SegmentAnalyses');
    if (!tableDesc.speakerLabel) {
      await queryInterface.addColumn('SegmentAnalyses', 'speakerLabel', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
        comment: 'Speaker label from ASR diarization e.g. SPEAKER_00',
      });
      console.log('✅ Added speakerLabel column to SegmentAnalyses');
    } else {
      console.log('ℹ️ speakerLabel column already exists, skipping');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('SegmentAnalyses');
    if (tableDesc.speakerLabel) {
      await queryInterface.removeColumn('SegmentAnalyses', 'speakerLabel');
    }
  },
};
