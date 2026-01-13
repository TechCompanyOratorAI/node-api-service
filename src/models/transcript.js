'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Transcript extends Model {
        static associate(models) {
            Transcript.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            Transcript.belongsTo(models.AudioRecord, { foreignKey: 'audioId', as: 'audioRecord' });
            Transcript.belongsTo(models.AIConfig, { foreignKey: 'configId', as: 'config' });

            Transcript.hasMany(models.TranscriptSegment, { foreignKey: 'transcriptId', as: 'segments' });
        }
    }

    Transcript.init(
        {
            transcriptId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false },
            audioId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
            configId: { type: DataTypes.INTEGER },

            fullTranscript: { type: DataTypes.TEXT },
            language: { type: DataTypes.STRING(10) },
            confidenceScore: { type: DataTypes.FLOAT },
            generatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            processingTimeSeconds: { type: DataTypes.INTEGER },
            aiModelVersion: { type: DataTypes.STRING(100) },
        },
        { sequelize, modelName: 'Transcript', tableName: 'Transcripts' }
    );

    return Transcript;
};
