'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('TopicEnrollments', {
            topicEnrollmentId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            studentId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            topicId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Topics', key: 'topicId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            enrolledAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            status: {
                type: Sequelize.ENUM('enrolled', 'dropped', 'completed'),
                allowNull: false,
                defaultValue: 'enrolled'
            },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('TopicEnrollments', {
            fields: ['studentId', 'topicId'],
            type: 'unique',
            name: 'uq_topic_enrollments_student_topic'
        });

        await queryInterface.addIndex('TopicEnrollments', ['topicId'], { name: 'idx_topic_enrollments_topic' });
        await queryInterface.addIndex('TopicEnrollments', ['studentId'], { name: 'idx_topic_enrollments_student' });
    },
    down: async (queryInterface) => queryInterface.dropTable('TopicEnrollments')
};
