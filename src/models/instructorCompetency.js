'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class InstructorCompetency extends Model {
        static associate(models) {
            InstructorCompetency.belongsTo(models.User, {
                foreignKey: 'instructorId',
                as: 'instructor'
            });
            InstructorCompetency.belongsTo(models.CompetencyCatalog, {
                foreignKey: 'competencyId',
                as: 'competency'
            });
            InstructorCompetency.belongsTo(models.User, {
                foreignKey: 'approvedBy',
                as: 'approver'
            });
            InstructorCompetency.hasMany(models.InstructorCompetencyEvidence, {
                foreignKey: 'instructorCompetencyId',
                as: 'evidences'
            });
        }
    }

    InstructorCompetency.init(
        {
            instructorCompetencyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            instructorId: { type: DataTypes.INTEGER, allowNull: false },
            competencyId: { type: DataTypes.INTEGER, allowNull: false },
            level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected'),
                allowNull: false,
                defaultValue: 'pending'
            },
            declaredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            approvedAt: { type: DataTypes.DATE, allowNull: true },
            approvedBy: { type: DataTypes.INTEGER, allowNull: true },
            rejectionReason: { type: DataTypes.TEXT, allowNull: true },
        },
        {
            sequelize,
            modelName: 'InstructorCompetency',
            tableName: 'instructor_competencies',
            indexes: [
                { unique: true, fields: ['instructorId', 'competencyId'] },
                { fields: ['instructorId'] },
                { fields: ['competencyId'] },
                { fields: ['status'] }
            ]
        }
    );

    return InstructorCompetency;
};

