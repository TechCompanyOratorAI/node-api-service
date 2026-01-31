module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('course_instructors', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            courseId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Courses', key: 'courseId' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            instructorId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            assignedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            assignedBy: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        });

        // Add unique constraint
        await queryInterface.addConstraint('course_instructors', {
            fields: ['courseId', 'instructorId'],
            type: 'unique',
            name: 'uq_course_instructor'
        });

        // Add indexes
        await queryInterface.addIndex('course_instructors', ['courseId'], {
            name: 'idx_course_instructors_course'
        });

        await queryInterface.addIndex('course_instructors', ['instructorId'], {
            name: 'idx_course_instructors_instructor'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('course_instructors');
    }
};
