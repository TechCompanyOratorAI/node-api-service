'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Presentations', 'submissionCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times this presentation has been submitted (incremented on each submit/resubmit).',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Presentations', 'submissionCount');
  },
};
