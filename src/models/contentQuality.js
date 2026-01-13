'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ContentQuality extends Model {
        static associate(models) {
            ContentQuality.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    ContentQuality.init(
        {
            metricId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            resultId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            coherenceScore: { type: DataTypes.FLOAT },
            depthScore: { type: DataTypes.FLOAT },
            accuracyScore: { type: DataTypes.FLOAT },
            topicCoverageScore: { type: DataTypes.FLOAT },
            strengths: { type: DataTypes.TEXT },
            weaknesses: { type: DataTypes.TEXT },
        },
        { sequelize, modelName: 'ContentQuality', tableName: 'ContentQuality' }
    );

    return ContentQuality;
};
