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
            resultId: { type: DataTypes.INTEGER },

            similarityScore: { type: DataTypes.FLOAT },
            embeddingModel: { type: DataTypes.STRING(100) },
            cosineDistance: { type: DataTypes.FLOAT },
            comparisonMethod: { type: DataTypes.STRING(100) },
        },
        { sequelize, modelName: 'SemanticSimilarity', tableName: 'SemanticSimilarity' }
    );

    return SemanticSimilarity;
};
