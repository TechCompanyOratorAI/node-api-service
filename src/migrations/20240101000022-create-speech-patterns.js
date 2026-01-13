'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('SpeechPatterns', {
            patternId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            resultId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'AnalysisResults', key: 'resultId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            fillerWordCount: { type: Sequelize.INTEGER },
            avgPauseDuration: { type: Sequelize.FLOAT },
            longPauseCount: { type: Sequelize.INTEGER },
            paceConsistency: { type: Sequelize.FLOAT },
            fillerWordList: { type: Sequelize.TEXT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('SpeechPatterns')
};
