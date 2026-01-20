'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class TranscriptSegment extends Model {
        static associate(models) {
            TranscriptSegment.belongsTo(models.Transcript, { foreignKey: 'transcriptId', as: 'transcript' });
            TranscriptSegment.belongsTo(models.Speaker, { foreignKey: 'speakerId', as: 'speaker' });
            TranscriptSegment.hasMany(models.SegmentAnalysis, { foreignKey: 'segmentId', as: 'segmentAnalyses' });
        }
    }

    TranscriptSegment.init(
        {
            segmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            transcriptId: { type: DataTypes.INTEGER, allowNull: false },
            speakerId: { type: DataTypes.INTEGER, allowNull: true },
            segmentNumber: { type: DataTypes.INTEGER, allowNull: false },

            segmentText: { type: DataTypes.TEXT, allowNull: false },
            startTimestamp: { type: DataTypes.FLOAT, allowNull: false },
            endTimestamp: { type: DataTypes.FLOAT, allowNull: false },
            wordCount: { type: DataTypes.INTEGER },
            semanticLabel: { type: DataTypes.STRING(120) },
            confidenceScore: { type: DataTypes.FLOAT },
        },
        { sequelize, modelName: 'TranscriptSegment', tableName: 'TranscriptSegments' }
    );

    return TranscriptSegment;
};
