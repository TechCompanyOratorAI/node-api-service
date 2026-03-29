'use strict';

/**
 * Fix migration: Force userId to be nullable using raw SQL
 * (Sequelize changeColumn with FK constraints in MySQL doesn't always update NOT NULL)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the existing FK constraint first, then alter column, then re-add FK
    // Step 1: Find and drop the foreign key on userId
    try {
      // Get all FK constraints for PresentationAccess
      const [results] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'PresentationAccess'
          AND COLUMN_NAME = 'userId'
          AND REFERENCED_TABLE_NAME = 'Users'
      `);

      for (const row of results) {
        await queryInterface.sequelize.query(
          `ALTER TABLE PresentationAccess DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
        );
        console.log(`Dropped FK: ${row.CONSTRAINT_NAME}`);
      }
    } catch (e) {
      console.warn('Could not drop FK on userId (may not exist):', e.message);
    }

    // Step 2: Alter the column to allow NULL
    await queryInterface.sequelize.query(`
      ALTER TABLE PresentationAccess
      MODIFY COLUMN userId INT NULL
    `);

    // Step 3: Re-add the FK with ON DELETE SET NULL (NULL is valid now)
    await queryInterface.sequelize.query(`
      ALTER TABLE PresentationAccess
      ADD CONSTRAINT fk_pa_userId
        FOREIGN KEY (userId) REFERENCES Users(userId)
        ON DELETE SET NULL ON UPDATE CASCADE
    `);

    console.log('userId column is now nullable with FK re-added.');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove new FK
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE PresentationAccess DROP FOREIGN KEY fk_pa_userId`
      );
    } catch (e) {
      console.warn('Could not drop fk_pa_userId:', e.message);
    }

    // Make column NOT NULL again
    await queryInterface.sequelize.query(`
      ALTER TABLE PresentationAccess
      MODIFY COLUMN userId INT NOT NULL
    `);

    // Re-add original FK
    await queryInterface.sequelize.query(`
      ALTER TABLE PresentationAccess
      ADD CONSTRAINT fk_pa_userId_orig
        FOREIGN KEY (userId) REFERENCES Users(userId)
        ON DELETE CASCADE ON UPDATE CASCADE
    `);
  },
};
