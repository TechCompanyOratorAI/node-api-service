'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Roles', {
            roleId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            roleName: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            description: { type: Sequelize.TEXT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    down: async (queryInterface) => queryInterface.dropTable('Roles')
};
