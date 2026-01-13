'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Enrollments', {
            enrollmentId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            studentId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            courseId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Courses', key: 'courseId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            enrolledAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            status: {
                type: Sequelize.ENUM('enrolled', 'dropped', 'completed'),
                allowNull: false,
                defaultValue: 'enrolled'
            },
            finalGrade: { type: Sequelize.FLOAT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('Enrollments', {
            fields: ['studentId', 'courseId'],
            type: 'unique',
            name: 'uq_enrollments_student_course'
        });

        await queryInterface.addIndex('Enrollments', ['courseId'], { name: 'idx_enrollments_course' });
        await queryInterface.addIndex('Enrollments', ['studentId'], { name: 'idx_enrollments_student' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Enrollments')
};
