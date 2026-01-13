'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PresentationAccess extends Model {
        static associate(models) {
            PresentationAccess.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            PresentationAccess.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
            PresentationAccess.belongsTo(models.User, { foreignKey: 'grantedBy', as: 'grantor' });
        }
    }

    PresentationAccess.init(
        {
            accessId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false },
            userId: { type: DataTypes.INTEGER, allowNull: false },
            accessLevel: {
                type: DataTypes.ENUM('view', 'comment', 'review', 'manage'),
                allowNull: false,
                defaultValue: 'view',
            },
            grantedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            grantedBy: { type: DataTypes.INTEGER },
            expiresAt: { type: DataTypes.DATE },
        },
        { sequelize, modelName: 'PresentationAccess', tableName: 'PresentationAccess' }
    );

    return PresentationAccess;
};
