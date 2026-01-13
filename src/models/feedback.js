'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Feedback extends Model {
        static associate(models) {
            Feedback.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            Feedback.belongsTo(models.User, { foreignKey: 'reviewerId', as: 'reviewer' });
        }
    }

    Feedback.init(
        {
            feedbackId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false },
            reviewerId: { type: DataTypes.INTEGER, allowNull: false },
            rating: { type: DataTypes.FLOAT },
            comments: { type: DataTypes.TEXT },
            feedbackType: {
                type: DataTypes.ENUM('general', 'content', 'delivery', 'structure', 'engagement'),
                allowNull: false,
                defaultValue: 'general',
            },
            isVisibleToStudent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            createdAtFeedback: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        {
            sequelize,
            modelName: 'Feedback',
            tableName: 'Feedback',
            createdAt: false,
            updatedAt: false,
        }
    );

    return Feedback;
};
