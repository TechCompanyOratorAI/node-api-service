'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Major extends Model {
        static associate(models) {
            Major.belongsTo(models.Department, {
                foreignKey: 'departmentId',
                as: 'department'
            });
            Major.hasMany(models.SubjectArea, {
                foreignKey: 'majorId',
                as: 'subjectAreas'
            });
            Major.hasMany(models.Course, {
                foreignKey: 'majorId',
                as: 'courses'
            });
            Major.hasMany(models.CompetencyCatalog, {
                foreignKey: 'majorId',
                as: 'competencies'
            });
        }
    }

    Major.init(
        {
            majorId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            majorCode: { type: DataTypes.STRING(30), allowNull: false, unique: true },
            majorName: { type: DataTypes.STRING(150), allowNull: false },
            departmentId: { type: DataTypes.INTEGER, allowNull: true },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            sequelize,
            modelName: 'Major',
            tableName: 'majors',
            indexes: [
                { unique: true, fields: ['majorCode'] },
                { fields: ['departmentId'] },
                { fields: ['isActive'] }
            ]
        }
    );

    return Major;
};

