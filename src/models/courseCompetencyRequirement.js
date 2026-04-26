'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class CourseCompetencyRequirement extends Model {
        static associate(models) {
            CourseCompetencyRequirement.belongsTo(models.Course, {
                foreignKey: 'courseId',
                as: 'course'
            });
            CourseCompetencyRequirement.belongsTo(models.CompetencyCatalog, {
                foreignKey: 'competencyId',
                as: 'competency'
            });
            CourseCompetencyRequirement.belongsTo(models.User, {
                foreignKey: 'createdBy',
                as: 'creator'
            });
        }
    }

    CourseCompetencyRequirement.init(
        {
            courseCompetencyRequirementId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            courseId: { type: DataTypes.INTEGER, allowNull: false },
            competencyId: { type: DataTypes.INTEGER, allowNull: false },
            minLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
            isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            createdBy: { type: DataTypes.INTEGER, allowNull: true },
        },
        {
            sequelize,
            modelName: 'CourseCompetencyRequirement',
            tableName: 'course_competency_requirements',
            indexes: [
                { unique: true, fields: ['courseId', 'competencyId'] },
                { fields: ['courseId'] },
                { fields: ['competencyId'] },
                { fields: ['isRequired'] }
            ]
        }
    );

    return CourseCompetencyRequirement;
};

