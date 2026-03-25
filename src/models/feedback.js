'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Feedback extends Model {
        static associate(models) {
            Feedback.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            Feedback.belongsTo(models.User, { foreignKey: 'reviewerId', as: 'reviewer' });
            Feedback.belongsTo(models.AIReport, { foreignKey: 'reportId', as: 'aiReport' });
        }
    }

    Feedback.init(
        {
            feedbackId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false },
            reviewerId: { type: DataTypes.INTEGER, allowNull: false },
            reportId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'FK AIReports — instructor feedback cho AI report',
            },
            rating: { type: DataTypes.FLOAT },
            comments: { type: DataTypes.TEXT },
            criterionFeedbacks: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            feedbackType: {
                type: DataTypes.ENUM(
                    'general',
                    'content',
                    'delivery',
                    'structure',
                    'engagement',
                    'ai_report_instructor'
                ),
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
