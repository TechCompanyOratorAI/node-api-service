'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('UserRoles', {
            userRoleId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            userId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            roleId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Roles', key: 'roleId' },
                onDelete: 'RESTRICT', onUpdate: 'CASCADE'
            },
            assignedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('UserRoles', {
            fields: ['userId', 'roleId'],
            type: 'unique',
            name: 'uq_user_roles_user_role'
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('UserRoles')
};
