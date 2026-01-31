// Remove single instructor FK from Courses
// Note: Run AFTER course_instructors populated
module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Remove foreign key constraint first
        await queryInterface.removeConstraint('Courses', 'Courses_ibfk_1');

        // Remove index
        await queryInterface.removeIndex('Courses', 'idx_courses_instructor');

        // Remove column
        await queryInterface.removeColumn('Courses', 'instructorId');
    },

    down: async (queryInterface, Sequelize) => {
        // Add column back
        await queryInterface.addColumn('Courses', 'instructorId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'userId' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        });

        // Add index back
        await queryInterface.addIndex('Courses', ['instructorId'], {
            name: 'idx_courses_instructor'
        });
    }
};
