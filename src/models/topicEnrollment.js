'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class TopicEnrollment extends Model {
        static associate(models) {
            TopicEnrollment.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' });
            TopicEnrollment.belongsTo(models.Topic, { foreignKey: 'topicId', as: 'topic' });
        }
    }

    TopicEnrollment.init(
        {
            topicEnrollmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            studentId: { type: DataTypes.INTEGER, allowNull: false },
            topicId: { type: DataTypes.INTEGER, allowNull: false },
            enrolledAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            status: {
                type: DataTypes.ENUM('enrolled', 'dropped', 'completed'),
                allowNull: false,
                defaultValue: 'enrolled',
            }
        },
        { sequelize, modelName: 'TopicEnrollment', tableName: 'TopicEnrollments' }
    );

    return TopicEnrollment;
};
