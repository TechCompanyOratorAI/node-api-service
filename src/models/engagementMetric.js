'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class EngagementMetric extends Model {
        static associate(models) {
            EngagementMetric.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    EngagementMetric.init(
        {
            metricId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            resultId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            enthusiasmScore: { type: DataTypes.FLOAT },
            variationScore: { type: DataTypes.FLOAT },
            rhetoricalDeviceCount: { type: DataTypes.INTEGER },
            emotionalTone: { type: DataTypes.FLOAT },
        },
        { sequelize, modelName: 'EngagementMetric', tableName: 'EngagementMetrics' }
    );

    return EngagementMetric;
};
