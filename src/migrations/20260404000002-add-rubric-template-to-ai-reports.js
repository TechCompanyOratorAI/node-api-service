'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('AIReports', 'rubricTemplateId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'RubricTemplates', key: 'rubricTemplateId' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('AIReports', ['rubricTemplateId'], {
      name: 'idx_ai_reports_rubric_template',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('AIReports', 'idx_ai_reports_rubric_template');
    await queryInterface.removeColumn('AIReports', 'rubricTemplateId');
  },
};
