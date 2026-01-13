'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Course extends Model {
        static associate(models) {
            Course.belongsTo(models.User, { foreignKey: 'instructorId', as: 'instructor' });

            Course.hasMany(models.Enrollment, { foreignKey: 'courseId', as: 'enrollments' });
            Course.hasMany(models.Topic, { foreignKey: 'courseId', as: 'topics' });
            Course.hasMany(models.Presentation, { foreignKey: 'courseId', as: 'presentations' });
        }
    }

    Course.init(
        {
            courseId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            courseCode: { type: DataTypes.STRING(30), allowNull: false },
            courseName: { type: DataTypes.STRING(200), allowNull: false },
            description: { type: DataTypes.TEXT },
            instructorId: { type: DataTypes.INTEGER, allowNull: false },
            semester: { type: DataTypes.STRING(30) },
            academicYear: { type: DataTypes.INTEGER },
            startDate: { type: DataTypes.DATEONLY },
            endDate: { type: DataTypes.DATEONLY },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        { sequelize, modelName: 'Course', tableName: 'Courses' }
    );

    return Course;
};
