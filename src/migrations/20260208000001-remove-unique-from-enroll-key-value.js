module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Remove unique index using raw SQL
        await queryInterface.sequelize.query(
            'ALTER TABLE `enroll_keys` DROP INDEX `uq_enroll_key_value`;'
        ).catch(() => {
            // Index might not exist, ignore error
        });

        // Remove unique constraint from keyValue column if it exists as a key
        await queryInterface.sequelize.query(
            'ALTER TABLE `enroll_keys` DROP INDEX `keyValue`;'
        ).catch(() => {
            // Index might not exist, ignore error
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Add back unique index
        await queryInterface.addIndex('enroll_keys', ['keyValue'], {
            name: 'uq_enroll_key_value',
            unique: true
        });
    }
};
