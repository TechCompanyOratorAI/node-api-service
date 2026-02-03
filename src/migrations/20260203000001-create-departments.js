'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('departments', {
            departmentId: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            departmentCode: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true,
                comment: 'Mã bộ môn (e.g., SE, CS, IT)'
            },
            departmentName: {
                type: Sequelize.STRING(200),
                allowNull: false,
                comment: 'Tên bộ môn (e.g., Software Engineering)'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Mô tả về bộ môn'
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                allowNull: false,
                comment: 'Trạng thái hoạt động'
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
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        });

        // Add indexes
        await queryInterface.addIndex('departments', ['departmentCode'], {
            name: 'idx_department_code'
        });
        await queryInterface.addIndex('departments', ['isActive'], {
            name: 'idx_department_active'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('departments');
    }
};
