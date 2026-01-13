'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('DeliveryQuality', {
            metricId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            resultId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'AnalysisResults', key: 'resultId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            clarityScore: { type: Sequelize.FLOAT },
            pronunciationScore: { type: Sequelize.FLOAT },
            volumeConsistency: { type: Sequelize.FLOAT },
            speechRateWpm: { type: Sequelize.FLOAT },
            voiceQuality: { type: Sequelize.TEXT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('DeliveryQuality')
};
