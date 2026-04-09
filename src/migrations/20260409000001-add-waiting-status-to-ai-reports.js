"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing ENUM values to reportStatus column in AIReports
    await queryInterface.sequelize.query(`
      ALTER TABLE AIReports
      MODIFY COLUMN reportStatus
        ENUM('pending', 'waiting', 'draft', 'pending_review', 'generating', 'completed', 'failed', 'confirmed', 'rejected')
        NOT NULL
        DEFAULT 'pending'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to original ENUM values (without pending and waiting)
    await queryInterface.sequelize.query(`
      ALTER TABLE AIReports
      MODIFY COLUMN reportStatus
        ENUM('draft', 'pending_review', 'generating', 'completed', 'failed', 'confirmed', 'rejected')
        NOT NULL
        DEFAULT 'draft'
    `);
  },
};
