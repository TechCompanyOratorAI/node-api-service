'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Jobs', {
            jobId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },

            presentationId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },

            jobType: {
                type: Sequelize.ENUM('asr', 'analysis', 'report'),
                allowNull: false
            },

            status: {
                type: Sequelize.ENUM('queued', 'running', 'completed', 'failed'),
                allowNull: false,
                defaultValue: 'queued'
            },

            sqsMessageId: { type: Sequelize.STRING(255) },
            workerName: { type: Sequelize.STRING(100) },

            startedAt: { type: Sequelize.DATE },
            completedAt: { type: Sequelize.DATE },

            errorMessage: { type: Sequelize.TEXT },
            retryCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },

            metadata: { type: Sequelize.JSON },

            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addIndex('Jobs', ['presentationId'], { name: 'idx_jobs_presentation' });
        await queryInterface.addIndex('Jobs', ['status'], { name: 'idx_jobs_status' });
        await queryInterface.addIndex('Jobs', ['jobType'], { name: 'idx_jobs_type' });
        await queryInterface.addIndex('Jobs', ['presentationId', 'jobType'], { name: 'idx_jobs_presentation_type' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Jobs')
};
