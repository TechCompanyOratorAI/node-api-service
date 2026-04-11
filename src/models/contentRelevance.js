'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ContentRelevance extends Model {
        static associate(models) {
            ContentRelevance.belongsTo(models.SegmentAnalysis, { foreignKey: 'segAnalysisId', as: 'segmentAnalysis' });
            ContentRelevance.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    ContentRelevance.init(
        {
            relevanceId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            segAnalysisId: { type: DataTypes.INTEGER, allowNull: false, unique: true },

            relevanceScore: { type: DataTypes.FLOAT },
            matchedConcepts: { type: DataTypes.TEXT }, // Joined topicKeywordsFound
            explanation: { type: DataTypes.TEXT },     // Joined issues list
        },
        { sequelize, modelName: 'ContentRelevance', tableName: 'ContentRelevance' }
    );

    return ContentRelevance;
};
