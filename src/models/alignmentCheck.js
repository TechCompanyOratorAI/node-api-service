'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AlignmentCheck extends Model {
        static associate(models) {
            AlignmentCheck.belongsTo(models.SegmentAnalysis, { foreignKey: 'segAnalysisId', as: 'segmentAnalysis' });
            AlignmentCheck.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    AlignmentCheck.init(
        {
            alignmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            segAnalysisId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            resultId: { type: DataTypes.INTEGER },

            alignmentStatus: {
                type: DataTypes.ENUM('aligned', 'off_slide', 'misaligned', 'unknown'),
                allowNull: false,
                defaultValue: 'unknown',
            },
            timingSyncScore: { type: DataTypes.FLOAT },
            misalignmentReason: { type: DataTypes.TEXT },
            expectedSlideNumber: { type: DataTypes.INTEGER },
        },
        { sequelize, modelName: 'AlignmentCheck', tableName: 'AlignmentChecks' }
    );

    return AlignmentCheck;
};
