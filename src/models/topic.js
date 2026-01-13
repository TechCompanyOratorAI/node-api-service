'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Topic extends Model {
        static associate(models) {
            Topic.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
            Topic.hasMany(models.Presentation, { foreignKey: 'topicId', as: 'presentations' });
        }
    }

    Topic.init(
        {
            topicId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            courseId: { type: DataTypes.INTEGER, allowNull: false },
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
