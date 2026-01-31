'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const CourseInstructor = sequelize.define('CourseInstructor', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        courseId: {
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
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'course_instructors',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['courseId', 'instructorId'] },
            { fields: ['courseId'] },
            { fields: ['instructorId'] }
        ]
    });

    CourseInstructor.associate = (models) => {
        CourseInstructor.belongsTo(models.Course, {
            foreignKey: 'courseId',
            as: 'course'
        });
        CourseInstructor.belongsTo(models.User, {
            foreignKey: 'instructorId',
            as: 'instructor'
        });
        CourseInstructor.belongsTo(models.User, {
            foreignKey: 'assignedBy',
            as: 'assigner'
        });
    };

    return CourseInstructor;
};
