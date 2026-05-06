'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Classes', 'maxSubmissions', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Maximum number of total submissions per presentation (1-3). Set by instructor.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Classes', 'maxSubmissions');
  },
};
