'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Permissions', {
            permissionId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            roleId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Roles', key: 'roleId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            resource: { type: Sequelize.STRING(100), allowNull: false },
            action: { type: Sequelize.STRING(50), allowNull: false },
            granted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('Permissions', {
            fields: ['roleId', 'resource', 'action'],
            type: 'unique',
            name: 'uq_permissions_role_resource_action'
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('Permissions')
};
