'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('StructureQuality', {
            metricId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            resultId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'AnalysisResults', key: 'resultId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            organizationScore: { type: Sequelize.FLOAT },
            transitionQuality: { type: Sequelize.FLOAT },
            introConclusionScore: { type: Sequelize.FLOAT },
            logicalFlowScore: { type: Sequelize.FLOAT },
            structureNotes: { type: Sequelize.TEXT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('StructureQuality')
};
