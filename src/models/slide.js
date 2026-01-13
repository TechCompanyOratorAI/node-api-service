'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Slide extends Model {
        static associate(models) {
            Slide.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            Slide.hasMany(models.SegmentAnalysis, { foreignKey: 'slideId', as: 'segmentAnalyses' });
        }
    }

    Slide.init(
        {
            slideId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false },
            slideNumber: { type: DataTypes.INTEGER, allowNull: false },

            filePath: { type: DataTypes.TEXT, allowNull: false },
            fileName: { type: DataTypes.TEXT },
            fileFormat: { type: DataTypes.STRING(20) },
            fileSizeBytes: { type: DataTypes.BIGINT },
            extractedText: { type: DataTypes.TEXT },
            thumbnailPath: { type: DataTypes.TEXT },
            uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { sequelize, modelName: 'Slide', tableName: 'Slides' }
    );

    return Slide;
};
