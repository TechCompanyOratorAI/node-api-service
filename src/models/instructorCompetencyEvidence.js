'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class InstructorCompetencyEvidence extends Model {
        static associate(models) {
            InstructorCompetencyEvidence.belongsTo(models.InstructorCompetency, {
                foreignKey: 'instructorCompetencyId',
                as: 'instructorCompetency'
            });
            InstructorCompetencyEvidence.belongsTo(models.User, {
                foreignKey: 'verifiedBy',
                as: 'verifier'
            });
        }
    }

    InstructorCompetencyEvidence.init(
        {
            evidenceId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            instructorCompetencyId: { type: DataTypes.INTEGER, allowNull: false },
            evidenceType: {
                type: DataTypes.ENUM('certificate', 'project', 'teaching_record', 'other'),
                allowNull: false,
                defaultValue: 'other'
            },
            title: { type: DataTypes.STRING(255), allowNull: false },
            url: { type: DataTypes.STRING(1000), allowNull: true },
            notes: { type: DataTypes.TEXT, allowNull: true },
            submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            verifiedAt: { type: DataTypes.DATE, allowNull: true },
            verifiedBy: { type: DataTypes.INTEGER, allowNull: true },
        },
        {
            sequelize,
            modelName: 'InstructorCompetencyEvidence',
            tableName: 'instructor_competency_evidences',
            indexes: [
                { fields: ['instructorCompetencyId'] },
                { fields: ['evidenceType'] }
            ]
        }
    );

    return InstructorCompetencyEvidence;
};

