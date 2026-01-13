'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Feedback', {
            feedbackId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            presentationId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            reviewerId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'RESTRICT', onUpdate: 'CASCADE'
            },
            rating: { type: Sequelize.FLOAT },
            comments: { type: Sequelize.TEXT },
            feedbackType: {
                type: Sequelize.ENUM('general', 'content', 'delivery', 'structure', 'engagement'),
                allowNull: false,
                defaultValue: 'general'
            },
            isVisibleToStudent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            createdAtFeedback: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addIndex('Feedback', ['presentationId', 'createdAtFeedback'], { name: 'idx_feedback_presentation_time' });
        await queryInterface.addIndex('Feedback', ['reviewerId'], { name: 'idx_feedback_reviewer' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Feedback')
};
