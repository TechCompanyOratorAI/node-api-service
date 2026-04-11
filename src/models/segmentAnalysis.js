"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SegmentAnalysis extends Model {
    static associate(models) {
      SegmentAnalysis.belongsTo(models.TranscriptSegment, {
        foreignKey: "segmentId",
        as: "segment",
      });
      SegmentAnalysis.belongsTo(models.Slide, {
        foreignKey: "slideId",
        as: "slide",
      });
      SegmentAnalysis.belongsTo(models.AIConfig, {
        foreignKey: "configId",
        as: "config",
      });

      SegmentAnalysis.hasOne(models.ContentRelevance, {
        foreignKey: "segAnalysisId",
        as: "contentRelevance",
      });
      SegmentAnalysis.hasOne(models.SemanticSimilarity, {
        foreignKey: "segAnalysisId",
        as: "semanticSimilarity",
      });
      SegmentAnalysis.hasOne(models.AlignmentCheck, {
        foreignKey: "segAnalysisId",
        as: "alignmentCheck",
      });
    }
  }

  SegmentAnalysis.init(
    {
      segAnalysisId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      segmentId: { type: DataTypes.INTEGER, allowNull: false },
      slideId: { type: DataTypes.INTEGER, allowNull: true }, // null when no slide match found

      analyzedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      relevanceScore: { type: DataTypes.FLOAT },       // Content relevance vs topic
      semanticScore: { type: DataTypes.FLOAT },        // Semantic similarity vs slides
      alignmentScore: { type: DataTypes.FLOAT },       // Timing alignment score
      bestMatchingSlide: { type: DataTypes.INTEGER },  // Best matching slide number
      expectedSlideNumber: { type: DataTypes.INTEGER },// Expected slide based on timing
      timingDeviation: { type: DataTypes.FLOAT },      // Timing deviation (seconds)
      issues: { type: DataTypes.JSON },                // Array of issues found
      suggestions: { type: DataTypes.JSON },           // Array of suggestions
      topicKeywordsFound: { type: DataTypes.JSON },    // Topic keywords found in segment
    },
    { sequelize, modelName: "SegmentAnalysis", tableName: "SegmentAnalyses" },
  );

  return SegmentAnalysis;
};
