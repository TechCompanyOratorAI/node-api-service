'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class CompetencyCatalog extends Model {
        static associate(models) {
            CompetencyCatalog.belongsTo(models.Department, {
                foreignKey: 'departmentId',
                as: 'department'
            });
            CompetencyCatalog.belongsTo(models.SubjectArea, {
                foreignKey: 'subjectAreaId',
                as: 'subjectArea'
            });
            CompetencyCatalog.hasMany(models.CourseCompetencyRequirement, {
                foreignKey: 'competencyId',
                as: 'courseRequirements'
            });
            CompetencyCatalog.hasMany(models.InstructorCompetency, {
                foreignKey: 'competencyId',
                as: 'instructorCompetencies'
            });
        }
    }

    CompetencyCatalog.init(
        {
            competencyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            competencyCode: { type: DataTypes.STRING(50), allowNull: false, unique: true },
            competencyName: { type: DataTypes.STRING(150), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            departmentId: { type: DataTypes.INTEGER, allowNull: true },
            subjectAreaId: { type: DataTypes.INTEGER, allowNull: true },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            sequelize,
            modelName: 'CompetencyCatalog',
            tableName: 'competency_catalogs',
            indexes: [
                { unique: true, fields: ['competencyCode'] },
                { fields: ['departmentId'] },
                { fields: ['subjectAreaId'] },
                { fields: ['isActive'] }
            ]
        }
    );

    return CompetencyCatalog;
};
