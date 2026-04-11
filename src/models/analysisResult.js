'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AnalysisResult extends Model {
        static associate(models) {
            AnalysisResult.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            // configId column has been dropped — AIConfig association removed

            // These sub-tables still use resultId (different sub-system, not semantic worker)
            AnalysisResult.hasOne(models.ContentQuality, { foreignKey: 'resultId', as: 'contentQuality' });
            AnalysisResult.hasOne(models.DeliveryQuality, { foreignKey: 'resultId', as: 'deliveryQuality' });
            AnalysisResult.hasOne(models.StructureQuality, { foreignKey: 'resultId', as: 'structureQuality' });
            AnalysisResult.hasOne(models.EngagementMetric, { foreignKey: 'resultId', as: 'engagementMetric' });
            AnalysisResult.hasOne(models.SpeechPattern, { foreignKey: 'resultId', as: 'speechPattern' });

            // resultId dropped from ContentRelevance/SemanticSimilarity/AlignmentChecks
            // Those tables now link only via segAnalysisId → SegmentAnalyses
        }
    }

    AnalysisResult.init(
        {
            resultId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false, unique: true },

            overallScore: { type: DataTypes.FLOAT },
            analyzedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
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
