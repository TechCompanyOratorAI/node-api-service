'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const ClassInstructor = sequelize.define('ClassInstructor', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        classId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        instructorId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        assignedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        assignedBy: {
            type: DataTypes.INTEGER
        },
        assignmentStatus: {
            type: DataTypes.ENUM('eligible', 'override'),
            allowNull: false,
            defaultValue: 'eligible'
        },
        overrideReason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        overrideBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        overrideAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'class_instructors',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['classId', 'instructorId'] },
            { fields: ['classId'] },
            { fields: ['instructorId'] }
        ]
    });

    ClassInstructor.associate = (models) => {
        ClassInstructor.belongsTo(models.Class, {
            foreignKey: 'classId',
            as: 'class'
        });
        ClassInstructor.belongsTo(models.User, {
            foreignKey: 'instructorId',
            as: 'instructor'
        });
        ClassInstructor.belongsTo(models.User, {
            foreignKey: 'assignedBy',
            as: 'assigner'
        });
        ClassInstructor.belongsTo(models.User, {
            foreignKey: 'overrideBy',
            as: 'overrideActor'
        });
    };

    return ClassInstructor;
};
