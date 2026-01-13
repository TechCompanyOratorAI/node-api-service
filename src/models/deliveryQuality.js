'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class DeliveryQuality extends Model {
        static associate(models) {
            DeliveryQuality.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    DeliveryQuality.init(
        {
            metricId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            resultId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            clarityScore: { type: DataTypes.FLOAT },
            pronunciationScore: { type: DataTypes.FLOAT },
            volumeConsistency: { type: DataTypes.FLOAT },
            speechRateWpm: { type: DataTypes.FLOAT },
            voiceQuality: { type: DataTypes.TEXT },
        },
        { sequelize, modelName: 'DeliveryQuality', tableName: 'DeliveryQuality' }
    );

    return DeliveryQuality;
};
