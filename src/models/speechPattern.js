'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SpeechPattern extends Model {
        static associate(models) {
            SpeechPattern.belongsTo(models.AnalysisResult, { foreignKey: 'resultId', as: 'analysisResult' });
        }
    }

    SpeechPattern.init(
        {
            patternId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            resultId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            fillerWordCount: { type: DataTypes.INTEGER },
            avgPauseDuration: { type: DataTypes.FLOAT },
            longPauseCount: { type: DataTypes.INTEGER },
            paceConsistency: { type: DataTypes.FLOAT },
            fillerWordList: { type: DataTypes.TEXT },
        },
        { sequelize, modelName: 'SpeechPattern', tableName: 'SpeechPatterns' }
    );

    return SpeechPattern;
};
