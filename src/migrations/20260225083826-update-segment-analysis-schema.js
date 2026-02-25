'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, allow slideId to be nullable
    await queryInterface.changeColumn('SegmentAnalyses', 'slideId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // Add new columns for semantic analysis results
    await queryInterface.addColumn('SegmentAnalyses', 'relevanceScore', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'semanticScore', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'alignmentScore', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'bestMatchingSlide', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'expectedSlideNumber', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'timingDeviation', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'issues', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'suggestions', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.addColumn('SegmentAnalyses', 'topicKeywordsFound', {
      type: Sequelize.JSON,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove added columns
    await queryInterface.removeColumn('SegmentAnalyses', 'topicKeywordsFound');
    await queryInterface.removeColumn('SegmentAnalyses', 'suggestions');
    await queryInterface.removeColumn('SegmentAnalyses', 'issues');
    await queryInterface.removeColumn('SegmentAnalyses', 'timingDeviation');
    await queryInterface.removeColumn('SegmentAnalyses', 'expectedSlideNumber');
    await queryInterface.removeColumn('SegmentAnalyses', 'bestMatchingSlide');
    await queryInterface.removeColumn('SegmentAnalyses', 'alignmentScore');
    await queryInterface.removeColumn('SegmentAnalyses', 'semanticScore');
    await queryInterface.removeColumn('SegmentAnalyses', 'relevanceScore');

    // Revert slideId to not null
    await queryInterface.changeColumn('SegmentAnalyses', 'slideId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};