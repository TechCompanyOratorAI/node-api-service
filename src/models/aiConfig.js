'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AIConfig extends Model {
        static associate(models) {
            AIConfig.belongsTo(models.User, { foreignKey: 'managedBy', as: 'manager' });
            AIConfig.hasMany(models.Transcript, { foreignKey: 'configId', as: 'transcripts' });
            AIConfig.hasMany(models.SegmentAnalysis, { foreignKey: 'configId', as: 'segmentAnalyses' });
            AIConfig.hasMany(models.AnalysisResult, { foreignKey: 'configId', as: 'analysisResults' });
        }
    }

    AIConfig.init(
        {
            configId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            configName: { type: DataTypes.STRING(120), allowNull: false },
            version: { type: DataTypes.STRING(50), allowNull: false },

            transcriptionModel: { type: DataTypes.STRING(100) },
            semanticModel: { type: DataTypes.STRING(100) },
            scoringAlgorithm: { type: DataTypes.STRING(100) },
            minConfidenceThreshold: { type: DataTypes.FLOAT },
            maxSegmentDuration: { type: DataTypes.INTEGER },

            scoringWeights: { type: DataTypes.JSON },
            analysisParameters: { type: DataTypes.JSON },

            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            managedBy: { type: DataTypes.INTEGER },
            createdAtConfig: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }, // avoid clash with Sequelize createdAt
        },
        {
            sequelize,
            modelName: 'AIConfig',
            tableName: 'AIConfigs',
            createdAt: false,
            updatedAt: false,
        }
    );

    return AIConfig;
};
