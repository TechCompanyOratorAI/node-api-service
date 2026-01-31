module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Classes', {
            classId: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            courseId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Courses', key: 'courseId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            classCode: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            className: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('active', 'closed', 'archived'),
                allowNull: false,
                defaultValue: 'active'
            },
            startDate: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            endDate: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            maxStudents: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            createdBy: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        // Add unique constraint for classCode per course
        await queryInterface.addConstraint('Classes', {
            fields: ['courseId', 'classCode'],
            type: 'unique',
            name: 'uq_class_code_per_course'
        });

        // Add indexes
        await queryInterface.addIndex('Classes', ['courseId'], {
            name: 'idx_classes_course'
        });

        await queryInterface.addIndex('Classes', ['status'], {
            name: 'idx_classes_status'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('Classes');
    }
};
