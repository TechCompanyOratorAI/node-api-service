'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      userId:
      {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username:
      {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      email:
      {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      firstName:
      {
        type: Sequelize.STRING(100)
      },
      lastName:
      {
        type: Sequelize.STRING(100)
      },
      passwordHash:
      {
        type: Sequelize.TEXT,
        allowNull: false
      },
      isActive:
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt:
      {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt:
      {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface) => queryInterface.dropTable('Users')
};
