'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Group = sequelize.define('Group', {
        groupId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        classId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Classes', key: 'classId' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        groupName: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'Groups',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['classId', 'groupName'] },
            { fields: ['classId'] }
        ]
    });

    Group.associate = (models) => {
        Group.belongsTo(models.Class, {
            foreignKey: 'classId',
            as: 'class'
        });
        Group.belongsToMany(models.User, {
            through: models.GroupStudent,
            foreignKey: 'groupId',
            otherKey: 'studentId',
            as: 'students'
        });
    };

    return Group;
};
