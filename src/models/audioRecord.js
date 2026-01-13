'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AudioRecord extends Model {
        static associate(models) {
            AudioRecord.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            AudioRecord.hasOne(models.Transcript, { foreignKey: 'audioId', as: 'transcript' });
        }
    }

    AudioRecord.init(
        {
            audioId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false, unique: true },

            filePath: { type: DataTypes.TEXT, allowNull: false },
            fileName: { type: DataTypes.TEXT },
            fileFormat: { type: DataTypes.STRING(20) },
            fileSizeBytes: { type: DataTypes.BIGINT },
            durationSeconds: { type: DataTypes.INTEGER },
            sampleRate: { type: DataTypes.INTEGER },
            recordingMethod: { type: DataTypes.STRING(50) },
            uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { sequelize, modelName: 'AudioRecord', tableName: 'AudioRecords' }
    );

    return AudioRecord;
};
