'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('SegmentAnalyses', {
            segAnalysisId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            segmentId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'TranscriptSegments', key: 'segmentId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            slideId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Slides', key: 'slideId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            configId: {
                type: Sequelize.INTEGER,
                references: { model: 'AIConfigs', key: 'configId' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            analyzedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            processingTimeMs: { type: Sequelize.INTEGER },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('SegmentAnalyses', {
            fields: ['segmentId', 'slideId'],
            type: 'unique',
            name: 'uq_segment_slide_unique'
        });

        await queryInterface.addIndex('SegmentAnalyses', ['segmentId'], { name: 'idx_seg_analysis_segment' });
        await queryInterface.addIndex('SegmentAnalyses', ['slideId'], { name: 'idx_seg_analysis_slide' });
    },
    down: async (queryInterface) => queryInterface.dropTable('SegmentAnalyses')
};
