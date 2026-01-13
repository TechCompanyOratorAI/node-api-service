'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Permission extends Model {
        static associate(models) {
            Permission.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
        }
    }

    Permission.init(
        {
            permissionId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            roleId: { type: DataTypes.INTEGER, allowNull: false },
            resource: { type: DataTypes.STRING(100), allowNull: false },
            action: { type: DataTypes.STRING(50), allowNull: false },
            granted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        { sequelize, modelName: 'Permission', tableName: 'Permissions' }
    );

    return Permission;
};
