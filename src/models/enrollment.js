'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Enrollment extends Model {
        static associate(models) {
            Enrollment.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' });
            Enrollment.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
        }
    }

    Enrollment.init(
        {
            enrollmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            studentId: { type: DataTypes.INTEGER, allowNull: false },
            courseId: { type: DataTypes.INTEGER, allowNull: false },
            enrolledAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            status: {
                type: DataTypes.ENUM('enrolled', 'dropped', 'completed'),
                allowNull: false,
                defaultValue: 'enrolled',
            },
            finalGrade: { type: DataTypes.FLOAT },
        },
        { sequelize, modelName: 'Enrollment', tableName: 'Enrollments' }
    );

    return Enrollment;
};
