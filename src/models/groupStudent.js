'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const GroupStudent = sequelize.define('GroupStudent', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        groupId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Groups', key: 'groupId' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'userId' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        joinedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        role: {
            type: DataTypes.ENUM('member', 'leader'),
            allowNull: false,
            defaultValue: 'member'
        }
    }, {
        tableName: 'GroupStudents',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['groupId', 'studentId'] },
            { fields: ['studentId'] },
            { fields: ['groupId'] }
        ]
    });

    GroupStudent.associate = (models) => {
        GroupStudent.belongsTo(models.Group, {
            foreignKey: 'groupId',
            as: 'group'
        });

        GroupStudent.belongsTo(models.User, {
            foreignKey: 'studentId',
            as: 'student'
        });
    };

    return GroupStudent;
};
