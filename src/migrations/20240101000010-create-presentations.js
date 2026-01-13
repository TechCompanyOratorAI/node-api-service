'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Presentations', {
            presentationId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },

            studentId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'RESTRICT', onUpdate: 'CASCADE'
            },
            courseId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Courses', key: 'courseId' },
                onDelete: 'RESTRICT', onUpdate: 'CASCADE'
            },
            topicId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Topics', key: 'topicId' },
                onDelete: 'RESTRICT', onUpdate: 'CASCADE'
            },

            title: { type: Sequelize.STRING(255), allowNull: false },
            description: { type: Sequelize.TEXT },
            submissionDate: { type: Sequelize.DATE },
            status: {
                type: Sequelize.ENUM('draft', 'submitted', 'processing', 'done', 'failed'),
                allowNull: false,
                defaultValue: 'draft'
            },
            durationSeconds: { type: Sequelize.INTEGER },
            visibility: {
                type: Sequelize.ENUM('private', 'course', 'shared', 'public'),
                allowNull: false,
                defaultValue: 'private'
            },
            versionNumber: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },

            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addIndex('Presentations', ['topicId'], { name: 'idx_presentations_topic' });
        await queryInterface.addIndex('Presentations', ['courseId'], { name: 'idx_presentations_course' });
        await queryInterface.addIndex('Presentations', ['studentId'], { name: 'idx_presentations_student' });
        await queryInterface.addIndex('Presentations', ['status'], { name: 'idx_presentations_status' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Presentations')
};
