'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        static associate(models) {
            Role.hasMany(models.UserRole, { foreignKey: 'roleId', as: 'userRoles' });
            Role.hasMany(models.Permission, { foreignKey: 'roleId', as: 'permissions' });
        }
    }

    Role.init(
        {
            roleId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            roleName: { type: DataTypes.STRING(50), allowNull: false, unique: true },
            description: { type: DataTypes.TEXT },
        },
        { sequelize, modelName: 'Role', tableName: 'Roles' }
    );

    return Role;
};
