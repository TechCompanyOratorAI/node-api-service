'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('SemanticSimilarity', {
            similarityId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            segAnalysisId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'SegmentAnalyses', key: 'segAnalysisId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            resultId: { type: Sequelize.INTEGER }, // FK later
            similarityScore: { type: Sequelize.FLOAT },
            embeddingModel: { type: Sequelize.STRING(100) },
            cosineDistance: { type: Sequelize.FLOAT },
            comparisonMethod: { type: Sequelize.STRING(100) },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('SemanticSimilarity')
};
