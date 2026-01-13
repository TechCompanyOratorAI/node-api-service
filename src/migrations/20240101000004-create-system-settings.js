'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('SystemSettings', {
            settingId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            settingKey: { type: Sequelize.STRING(150), allowNull: false, unique: true },
            settingValue: { type: Sequelize.TEXT, allowNull: false },
            dataType: { type: Sequelize.STRING(30), allowNull: false },
            category: { type: Sequelize.STRING(80) },
            description: { type: Sequelize.TEXT },
            updatedAtSetting: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedBy: {
                type: Sequelize.INTEGER,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            }
        });

        await queryInterface.addIndex('SystemSettings', ['category'], { name: 'idx_system_settings_category' });
    },
    down: async (queryInterface) => queryInterface.dropTable('SystemSettings')
};
