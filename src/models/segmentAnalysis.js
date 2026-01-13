'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SegmentAnalysis extends Model {
        static associate(models) {
            SegmentAnalysis.belongsTo(models.TranscriptSegment, { foreignKey: 'segmentId', as: 'segment' });
            SegmentAnalysis.belongsTo(models.Slide, { foreignKey: 'slideId', as: 'slide' });
            SegmentAnalysis.belongsTo(models.AIConfig, { foreignKey: 'configId', as: 'config' });

            SegmentAnalysis.hasOne(models.ContentRelevance, { foreignKey: 'segAnalysisId', as: 'contentRelevance' });
            SegmentAnalysis.hasOne(models.SemanticSimilarity, { foreignKey: 'segAnalysisId', as: 'semanticSimilarity' });
            SegmentAnalysis.hasOne(models.AlignmentCheck, { foreignKey: 'segAnalysisId', as: 'alignmentCheck' });
        }
    }

    SegmentAnalysis.init(
        {
            segAnalysisId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            segmentId: { type: DataTypes.INTEGER, allowNull: false },
            slideId: { type: DataTypes.INTEGER, allowNull: false },
            configId: { type: DataTypes.INTEGER },

            analyzedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            processingTimeMs: { type: DataTypes.INTEGER },
        },
        { sequelize, modelName: 'SegmentAnalysis', tableName: 'SegmentAnalyses' }
    );

    return SegmentAnalysis;
};
