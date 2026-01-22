'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add 'slides' to the jobType ENUM
        await queryInterface.sequelize.query(`
            ALTER TABLE Jobs 
            MODIFY COLUMN jobType ENUM('asr', 'analysis', 'report', 'slides') NOT NULL
        `);
    },

    down: async (queryInterface, Sequelize) => {
        // Remove 'slides' from the jobType ENUM (revert to original)
        await queryInterface.sequelize.query(`
            ALTER TABLE Jobs 
            MODIFY COLUMN jobType ENUM('asr', 'analysis', 'report') NOT NULL
        `);
    }
};
