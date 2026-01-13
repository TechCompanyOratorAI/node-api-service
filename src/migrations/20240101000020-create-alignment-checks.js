'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('AlignmentChecks', {
            alignmentId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            segAnalysisId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'SegmentAnalyses', key: 'segAnalysisId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            resultId: { type: Sequelize.INTEGER }, // FK later
            alignmentStatus: {
                type: Sequelize.ENUM('aligned', 'off_slide', 'misaligned', 'unknown'),
                allowNull: false,
                defaultValue: 'unknown'
            },
            timingSyncScore: { type: Sequelize.FLOAT },
            misalignmentReason: { type: Sequelize.TEXT },
            expectedSlideNumber: { type: Sequelize.INTEGER },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('AlignmentChecks')
};
