'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'dob', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'studyMajor', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'isCensored', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'isCensored');
    await queryInterface.removeColumn('Users', 'studyMajor');
    await queryInterface.removeColumn('Users', 'dob');
  }
};