'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class StructureQuality extends Model {
        static associate(models) {
            StructureQuality.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    StructureQuality.init(
        {
            metricId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            resultId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            organizationScore: { type: DataTypes.FLOAT },
            transitionQuality: { type: DataTypes.FLOAT },
            introConclusionScore: { type: DataTypes.FLOAT },
            logicalFlowScore: { type: DataTypes.FLOAT },
            structureNotes: { type: DataTypes.TEXT },
        },
        { sequelize, modelName: 'StructureQuality', tableName: 'StructureQuality' }
    );

    return StructureQuality;
};
