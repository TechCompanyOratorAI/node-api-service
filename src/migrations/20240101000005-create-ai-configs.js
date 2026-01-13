'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('AIConfigs', {
            configId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            configName: { type: Sequelize.STRING(120), allowNull: false },
            version: { type: Sequelize.STRING(50), allowNull: false },

            transcriptionModel: { type: Sequelize.STRING(100) },
            semanticModel: { type: Sequelize.STRING(100) },
            scoringAlgorithm: { type: Sequelize.STRING(100) },
            minConfidenceThreshold: { type: Sequelize.FLOAT },
            maxSegmentDuration: { type: Sequelize.INTEGER },

            scoringWeights: { type: Sequelize.JSON },
            analysisParameters: { type: Sequelize.JSON },

            isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            managedBy: {
                type: Sequelize.INTEGER,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            createdAtConfig: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('AIConfigs', {
            fields: ['configName', 'version'],
            type: 'unique',
            name: 'uq_ai_configs_name_version'
        });

        await queryInterface.addIndex('AIConfigs', ['isActive'], { name: 'idx_ai_configs_active' });
    },
    down: async (queryInterface) => queryInterface.dropTable('AIConfigs')
};
