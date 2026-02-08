"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove className and description columns from Classes table
    await queryInterface.removeColumn("Classes", "className");
    await queryInterface.removeColumn("Classes", "description");
  },

  async down(queryInterface, Sequelize) {
    // Add back className and description columns
    await queryInterface.addColumn("Classes", "className", {
      type: Sequelize.STRING(200),
      allowNull: false,
      defaultValue: "Untitled Class",
    });

    await queryInterface.addColumn("Classes", "description", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
