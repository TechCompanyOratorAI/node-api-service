'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SystemSetting extends Model {
        static associate(models) {
            SystemSetting.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
        }
    }

    SystemSetting.init(
        {
            settingId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            settingKey: { type: DataTypes.STRING(150), allowNull: false, unique: true },
            settingValue: { type: DataTypes.TEXT, allowNull: false },
            dataType: { type: DataTypes.STRING(30), allowNull: false },
            category: { type: DataTypes.STRING(80) },
            description: { type: DataTypes.TEXT },
            updatedAtSetting: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updatedBy: { type: DataTypes.INTEGER },
        },
        {
            sequelize,
            modelName: 'SystemSetting',
            tableName: 'SystemSettings',
            createdAt: false,
            updatedAt: false,
        }
    );

    return SystemSetting;
};
