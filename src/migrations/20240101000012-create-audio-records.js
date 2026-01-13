'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('AudioRecords', {
            audioId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            presentationId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            filePath: { type: Sequelize.TEXT, allowNull: false },
            fileName: { type: Sequelize.TEXT },
            fileFormat: { type: Sequelize.STRING(20) },
            fileSizeBytes: { type: Sequelize.BIGINT },
            durationSeconds: { type: Sequelize.INTEGER },
            sampleRate: { type: Sequelize.INTEGER },
            recordingMethod: { type: Sequelize.STRING(50) },
            uploadedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('AudioRecords')
};
