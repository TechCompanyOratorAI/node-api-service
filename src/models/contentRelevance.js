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
            // link contributes_to analysis_result (optional but aligns ERD)
            resultId: { type: DataTypes.INTEGER },

            relevanceScore: { type: DataTypes.FLOAT },
            matchedConcepts: { type: DataTypes.TEXT },
            missingConcepts: { type: DataTypes.TEXT },
            explanation: { type: DataTypes.TEXT },
        },
        { sequelize, modelName: 'ContentRelevance', tableName: 'ContentRelevance' }
    );

    return ContentRelevance;
};
