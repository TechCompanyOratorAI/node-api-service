'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AnalysisResult extends Model {
        static associate(models) {
            AnalysisResult.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            AnalysisResult.belongsTo(models.AIConfig, { foreignKey: 'configId', as: 'config' });

            AnalysisResult.hasOne(models.ContentQuality, { foreignKey: 'resultId', as: 'contentQuality' });
            AnalysisResult.hasOne(models.DeliveryQuality, { foreignKey: 'resultId', as: 'deliveryQuality' });
            AnalysisResult.hasOne(models.StructureQuality, { foreignKey: 'resultId', as: 'structureQuality' });
            AnalysisResult.hasOne(models.EngagementMetric, { foreignKey: 'resultId', as: 'engagementMetric' });
            AnalysisResult.hasOne(models.SpeechPattern, { foreignKey: 'resultId', as: 'speechPattern' });

            AnalysisResult.hasMany(models.ContentRelevance, { foreignKey: 'resultId', as: 'contentRelevances' });
            AnalysisResult.hasMany(models.SemanticSimilarity, { foreignKey: 'resultId', as: 'semanticSimilarities' });
            AnalysisResult.hasMany(models.AlignmentCheck, { foreignKey: 'resultId', as: 'alignmentChecks' });
        }
    }

    AnalysisResult.init(
        {
            resultId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            configId: { type: DataTypes.INTEGER },

            overallScore: { type: DataTypes.FLOAT },
            analyzedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            processingTimeSeconds: { type: DataTypes.INTEGER },
            aiModelVersion: { type: DataTypes.STRING(100) },
            status: {
                type: DataTypes.ENUM('queued', 'running', 'done', 'failed'),
                allowNull: false,
                defaultValue: 'queued',
            },
        },
        { sequelize, modelName: 'AnalysisResult', tableName: 'AnalysisResults' }
    );

    return AnalysisResult;
};
