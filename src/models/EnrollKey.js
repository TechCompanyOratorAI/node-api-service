'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const EnrollKey = sequelize.define('EnrollKey', {
        keyId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        classId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        keyValue: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        expiresAt: {
            type: DataTypes.DATE
        },
        maxUses: {
            type: DataTypes.INTEGER
        },
        usedCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        isRevoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        revokedAt: {
            type: DataTypes.DATE
        },
        revokedBy: {
            type: DataTypes.INTEGER
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'enroll_keys',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['keyValue'] },
            { fields: ['classId'] },
            { fields: ['isActive', 'expiresAt'] }
        ]
    });

    EnrollKey.associate = (models) => {
        EnrollKey.belongsTo(models.Class, {
            foreignKey: 'classId',
            as: 'class'
        });
        EnrollKey.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator'
        });
        EnrollKey.belongsTo(models.User, {
            foreignKey: 'revokedBy',
            as: 'revoker'
        });
    };

    // Instance method to validate key
    EnrollKey.prototype.isValid = function () {
        if (!this.isActive || this.isRevoked) return false;
        if (this.expiresAt && new Date() > new Date(this.expiresAt)) return false;
        if (this.maxUses && this.usedCount >= this.maxUses) return false;
        return true;
    };

    return EnrollKey;
};
