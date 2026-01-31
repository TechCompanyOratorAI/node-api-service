'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Courses', 'majorCode', {
            type: Sequelize.STRING(20),
            allowNull: true,
            after: 'courseName',
            comment: 'Major code (e.g., SE for Software Engineering, CS for Computer Science)'
        });

        // Add index for faster filtering by major
        await queryInterface.addIndex('Courses', ['majorCode'], {
            name: 'idx_courses_major_code'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex('Courses', 'idx_courses_major_code');
        await queryInterface.removeColumn('Courses', 'majorCode');
    }
};
