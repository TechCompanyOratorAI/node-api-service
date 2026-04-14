'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Classes', 'isUploadEnabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('Classes', 'uploadStartDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('Classes', 'uploadEndDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Classes', 'isUploadEnabled');
    await queryInterface.removeColumn('Classes', 'uploadStartDate');
    await queryInterface.removeColumn('Classes', 'uploadEndDate');
  },
};
