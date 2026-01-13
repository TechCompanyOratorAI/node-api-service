'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('ContentRelevance', {
            relevanceId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            segAnalysisId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'SegmentAnalyses', key: 'segAnalysisId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            resultId: { type: Sequelize.INTEGER }, // add FK later (AnalysisResults created later)
            relevanceScore: { type: Sequelize.FLOAT },
            matchedConcepts: { type: Sequelize.TEXT },
            missingConcepts: { type: Sequelize.TEXT },
            explanation: { type: Sequelize.TEXT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('ContentRelevance')
};
