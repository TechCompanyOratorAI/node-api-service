'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First add 'semantic' to the jobType ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE jobs 
      MODIFY COLUMN jobType ENUM('asr', 'analysis', 'semantic', 'report', 'slides') NOT NULL
    `);
    
    // Update existing 'analysis' jobs to 'semantic' for clarity
    await queryInterface.sequelize.query(`UPDATE jobs SET jobType = 'semantic' WHERE jobType = 'analysis'`);
    
    // Remove 'analysis' from the jobType ENUM after migration
    await queryInterface.sequelize.query(`
      ALTER TABLE jobs 
      MODIFY COLUMN jobType ENUM('asr', 'semantic', 'report', 'slides') NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert 'semantic' jobs back to 'analysis' if needed
    await queryInterface.sequelize.query(`UPDATE jobs SET jobType = 'analysis' WHERE jobType = 'semantic'`);
    
    // Remove 'semantic' from the jobType ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE jobs 
      MODIFY COLUMN jobType ENUM('asr', 'analysis', 'report', 'slides') NOT NULL
    `);
  }
};