'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ClassEmailWhitelists', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Classes', key: 'classId' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Index for fast lookup
    await queryInterface.addIndex('ClassEmailWhitelists', ['classId', 'email'], {
      unique: true,
      name: 'class_email_whitelist_unique',
    });
    await queryInterface.addIndex('ClassEmailWhitelists', ['classId'], {
      name: 'class_email_whitelist_classId',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ClassEmailWhitelists');
  },
};
