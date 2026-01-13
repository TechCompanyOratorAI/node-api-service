'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('EngagementMetrics', {
            metricId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            resultId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'AnalysisResults', key: 'resultId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            enthusiasmScore: { type: Sequelize.FLOAT },
            variationScore: { type: Sequelize.FLOAT },
            rhetoricalDeviceCount: { type: Sequelize.INTEGER },
            emotionalTone: { type: Sequelize.FLOAT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('EngagementMetrics')
};
