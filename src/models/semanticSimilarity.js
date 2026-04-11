'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SemanticSimilarity extends Model {
        static associate(models) {
            SemanticSimilarity.belongsTo(models.SegmentAnalysis, { foreignKey: 'segAnalysisId', as: 'segmentAnalysis' });
            SemanticSimilarity.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    SemanticSimilarity.init(
        {
            similarityId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            segAnalysisId: { type: DataTypes.INTEGER, allowNull: false, unique: true },

            similarityScore: { type: DataTypes.FLOAT }, // Cosine similarity vs slide content
        },
        { sequelize, modelName: 'SemanticSimilarity', tableName: 'SemanticSimilarity' }
    );

    return SemanticSimilarity;
};
