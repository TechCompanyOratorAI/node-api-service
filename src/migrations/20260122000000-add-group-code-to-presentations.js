'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Presentations', 'groupCode', {
            type: Sequelize.STRING(50),
            allowNull: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Presentations', 'groupCode');
    }
};