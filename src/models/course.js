'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Course extends Model {
        static associate(models) {
            // Multi-instructor support via course_instructors M:N table
            Course.belongsToMany(models.User, {
                through: models.CourseInstructor,
                foreignKey: 'courseId',
                otherKey: 'instructorId',
                as: 'instructors'
            });

            Course.hasMany(models.CourseInstructor, {
                foreignKey: 'courseId',
                as: 'courseInstructors'
            });

            // Class hierarchy: Course -> Classes
            Course.hasMany(models.Class, {
                foreignKey: 'courseId',
                as: 'classes'
            });

            // Department association
            Course.belongsTo(models.Department, {
                foreignKey: 'departmentId',
                as: 'department'
            });

            Course.belongsTo(models.AcademicBlock, {
                foreignKey: 'academicBlockId',
                as: 'academicBlock'
            });
            Course.belongsToMany(models.AcademicBlock, {
                through: models.CourseAcademicBlock,
                foreignKey: 'courseId',
                otherKey: 'academicBlockId',
                as: 'academicBlocks'
            });
            Course.hasMany(models.CourseAcademicBlock, {
                foreignKey: 'courseId',
                as: 'courseAcademicBlocks'
            });

            // Keep existing associations
            // Enrollment removed - now belongs to Class, not Course
            Course.hasMany(models.Topic, { foreignKey: 'courseId', as: 'topics' });
            Course.hasMany(models.Presentation, { foreignKey: 'courseId', as: 'presentations' });
        }
    }

    Course.init(
        {
            courseId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            courseCode: { type: DataTypes.STRING(30), allowNull: false },
            courseName: { type: DataTypes.STRING(200), allowNull: false },
            majorCode: { type: DataTypes.STRING(20), allowNull: true, comment: 'Major code (e.g., SE, CS, IT)' },
            departmentId: { type: DataTypes.INTEGER, allowNull: true, comment: 'Department ID' },
            description: { type: DataTypes.TEXT },
            semester: { type: DataTypes.STRING(30) },
            academicYear: { type: DataTypes.INTEGER },
            academicBlockId: { type: DataTypes.INTEGER, allowNull: true },
            startDate: { type: DataTypes.DATEONLY },
            endDate: { type: DataTypes.DATEONLY },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        { sequelize, modelName: 'Course', tableName: 'Courses' }
    );

    return Course;
};
