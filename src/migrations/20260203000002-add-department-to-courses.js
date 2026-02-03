'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Courses', 'departmentId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'departments',
                key: 'departmentId'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'Bộ môn phụ trách khóa học'
        });

        // Add index for faster queries
        await queryInterface.addIndex('Courses', ['departmentId'], {
            name: 'idx_course_department'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('Courses', 'idx_course_department');
        await queryInterface.removeColumn('Courses', 'departmentId');
    }
};
