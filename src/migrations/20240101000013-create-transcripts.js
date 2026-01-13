'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Transcripts', {
            transcriptId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            presentationId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            audioId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'AudioRecords', key: 'audioId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            configId: {
                type: Sequelize.INTEGER,
                references: { model: 'AIConfigs', key: 'configId' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            fullTranscript: { type: Sequelize.TEXT },
            language: { type: Sequelize.STRING(10) },
            confidenceScore: { type: Sequelize.FLOAT },
            generatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            processingTimeSeconds: { type: Sequelize.INTEGER },
            aiModelVersion: { type: Sequelize.STRING(100) },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addIndex('Transcripts', ['presentationId'], { name: 'idx_transcripts_presentation' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Transcripts')
};
