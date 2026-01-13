'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Courses', {
            courseId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            courseCode: { type: Sequelize.STRING(30), allowNull: false },
            courseName: { type: Sequelize.STRING(200), allowNull: false },
            description: { type: Sequelize.TEXT },
            instructorId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'RESTRICT', onUpdate: 'CASCADE'
            },
            semester: { type: Sequelize.STRING(30) },
            academicYear: { type: Sequelize.INTEGER },
            startDate: { type: Sequelize.DATEONLY },
            endDate: { type: Sequelize.DATEONLY },
            isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addIndex('Courses', ['instructorId'], { name: 'idx_courses_instructor' });
        await queryInterface.addConstraint('Courses', {
            fields: ['courseCode', 'academicYear', 'semester'],
            type: 'unique',
            name: 'uq_courses_code_year_sem'
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('Courses')
};
