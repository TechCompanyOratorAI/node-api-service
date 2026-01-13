'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UserRole extends Model {
        static associate(models) {
            UserRole.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
            UserRole.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
        }
    }

    UserRole.init(
        {
            userRoleId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            userId: { type: DataTypes.INTEGER, allowNull: false },
            roleId: { type: DataTypes.INTEGER, allowNull: false },
            assignedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { sequelize, modelName: 'UserRole', tableName: 'UserRoles' }
    );

    return UserRole;
};
