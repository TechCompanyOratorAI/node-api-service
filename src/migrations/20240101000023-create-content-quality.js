'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('ContentQuality', {
            metricId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            resultId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'AnalysisResults', key: 'resultId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            coherenceScore: { type: Sequelize.FLOAT },
            depthScore: { type: Sequelize.FLOAT },
            accuracyScore: { type: Sequelize.FLOAT },
            topicCoverageScore: { type: Sequelize.FLOAT },
            strengths: { type: Sequelize.TEXT },
            weaknesses: { type: Sequelize.TEXT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('ContentQuality')
};
