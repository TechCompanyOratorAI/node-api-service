module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('class_instructors', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Classes', key: 'classId' },
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
        await queryInterface.addConstraint('class_instructors', {
            fields: ['classId', 'instructorId'],
            type: 'unique',
            name: 'uq_class_instructor'
        });

        // Add indexes
        await queryInterface.addIndex('class_instructors', ['classId'], {
            name: 'idx_class_instructors_class'
        });

        await queryInterface.addIndex('class_instructors', ['instructorId'], {
            name: 'idx_class_instructors_instructor'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('class_instructors');
    }
};
