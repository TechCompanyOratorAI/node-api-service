'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Topics', {
            topicId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            courseId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Courses', key: 'courseId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            topicName: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT },
            sequenceNumber: { type: Sequelize.INTEGER, allowNull: false },
            dueDate: { type: Sequelize.DATE },
            maxDurationMinutes: { type: Sequelize.INTEGER },
            requirements: { type: Sequelize.TEXT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('Topics', {
            fields: ['courseId', 'sequenceNumber'],
            type: 'unique',
            name: 'uq_topics_course_sequence'
        });

        await queryInterface.addIndex('Topics', ['courseId'], { name: 'idx_topics_course' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Topics')
};
