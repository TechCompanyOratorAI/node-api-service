'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class TopicEnrollment extends Model {
        static associate(models) {
            TopicEnrollment.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' });
            TopicEnrollment.belongsTo(models.Topic, { foreignKey: 'topicId', as: 'topic' });
            TopicEnrollment.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
        }
    }

    TopicEnrollment.init(
        {
            topicEnrollmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            studentId: { type: DataTypes.INTEGER, allowNull: false },
            topicId: { type: DataTypes.INTEGER, allowNull: false },
            // groupId: khi nhóm trưởng chọn topic cho cả nhóm
            groupId: { type: DataTypes.INTEGER, allowNull: true },
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
