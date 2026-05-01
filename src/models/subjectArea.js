'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SubjectArea extends Model {
        static associate(models) {
            SubjectArea.belongsTo(models.Department, {
                foreignKey: 'departmentId',
                as: 'department'
            });
            SubjectArea.hasMany(models.Course, {
                foreignKey: 'subjectAreaId',
                as: 'courses'
            });
            SubjectArea.belongsToMany(models.Course, {
                through: models.CourseSubjectArea,
                foreignKey: 'subjectAreaId',
                otherKey: 'courseId',
                as: 'mappedCourses'
            });
            SubjectArea.hasMany(models.CourseSubjectArea, {
                foreignKey: 'subjectAreaId',
                as: 'courseSubjectAreas'
            });
            SubjectArea.hasMany(models.CompetencyCatalog, {
                foreignKey: 'subjectAreaId',
                as: 'competencies'
            });
        }
    }

    SubjectArea.init(
        {
            subjectAreaId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            subjectCode: { type: DataTypes.STRING(30), allowNull: false, unique: true },
            subjectName: { type: DataTypes.STRING(150), allowNull: false },
            majorId: { type: DataTypes.INTEGER, allowNull: true },
            departmentId: { type: DataTypes.INTEGER, allowNull: true },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            sequelize,
            modelName: 'SubjectArea',
            tableName: 'subject_areas',
            indexes: [
                { unique: true, fields: ['subjectCode'] },
                { fields: ['departmentId'] },
                { fields: ['isActive'] }
            ]
        }
    );

    return SubjectArea;
};
