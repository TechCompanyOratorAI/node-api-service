module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Create Groups table
        await queryInterface.createTable('Groups', {
            groupId: {
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
            groupName: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT
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

        // Add unique index for groupName within a class
        await queryInterface.addIndex('Groups', ['classId', 'groupName'], {
            name: 'uq_groups_class_groupName',
            unique: true
        });

        // Add index for classId
        await queryInterface.addIndex('Groups', ['classId'], {
            name: 'idx_groups_class'
        });
    },

    down: async (queryInterface) => {
        // Kiểm tra và xóa indexes từ Groups (nếu tồn tại)
        try {
            await queryInterface.removeIndex('Groups', 'idx_groups_class');
        } catch (e) {
            // Index có thể không tồn tại
        }
        try {
            await queryInterface.removeIndex('Groups', 'uq_groups_class_groupName');
        } catch (e) {
            // Index có thể không tồn tại
        }

        // Drop Groups table
        await queryInterface.dropTable('Groups');
    }
};
