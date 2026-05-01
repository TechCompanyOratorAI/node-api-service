'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class CourseSubjectArea extends Model {
        static associate(models) {
            CourseSubjectArea.belongsTo(models.Course, {
                foreignKey: 'courseId',
                as: 'course'
            });
            CourseSubjectArea.belongsTo(models.SubjectArea, {
                foreignKey: 'subjectAreaId',
                as: 'subjectArea'
            });
        }
    }

    CourseSubjectArea.init(
        {
            courseSubjectAreaId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            courseId: { type: DataTypes.INTEGER, allowNull: false },
            subjectAreaId: { type: DataTypes.INTEGER, allowNull: false },
            isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        },
        {
            sequelize,
            modelName: 'CourseSubjectArea',
            tableName: 'course_subject_areas',
            indexes: [
                { fields: ['courseId'] },
                { fields: ['subjectAreaId'] },
                { unique: true, fields: ['courseId', 'subjectAreaId'] },
            ]
        }
    );

    return CourseSubjectArea;
};

