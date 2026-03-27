'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Topic extends Model {
        static associate(models) {
            // Topic now belongs to Class (not Course directly)
            Topic.belongsTo(models.Class, { foreignKey: 'classId', as: 'class' });
            // Keep courseId for reference
            Topic.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
            Topic.hasMany(models.TopicEnrollment, { foreignKey: 'topicId', as: 'enrollments' });
            Topic.hasMany(models.Presentation, { foreignKey: 'topicId', as: 'presentations' });
        }
    }

    Topic.init(
        {
            topicId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            classId: { type: DataTypes.INTEGER, allowNull: true },   // FK → Classes (primary)
            courseId: { type: DataTypes.INTEGER, allowNull: true },   // nullable (legacy)
            topicName: { type: DataTypes.STRING(200), allowNull: false },
            description: { type: DataTypes.TEXT },
            sequenceNumber: { type: DataTypes.INTEGER, allowNull: false },
            dueDate: { type: DataTypes.DATE },
            maxDurationMinutes: { type: DataTypes.INTEGER },
            requirements: { type: DataTypes.TEXT },
        },
        { sequelize, modelName: 'Topic', tableName: 'Topics' }
    );

    return Topic;
};
