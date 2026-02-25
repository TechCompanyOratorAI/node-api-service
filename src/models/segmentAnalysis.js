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
      slideId: { type: DataTypes.INTEGER, allowNull: true }, // Allow null for cases where no slide match found
      configId: { type: DataTypes.INTEGER },

      analyzedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      processingTimeMs: { type: DataTypes.INTEGER },
      
      // Add fields that semantic worker actually provides
      relevanceScore: { type: DataTypes.FLOAT }, // Content relevance score
      semanticScore: { type: DataTypes.FLOAT },  // Semantic similarity score
      alignmentScore: { type: DataTypes.FLOAT }, // Timing alignment score
      bestMatchingSlide: { type: DataTypes.INTEGER }, // Best matching slide number (not slideId)
      expectedSlideNumber: { type: DataTypes.INTEGER }, // Expected slide based on timing
      timingDeviation: { type: DataTypes.FLOAT }, // Timing deviation
      issues: { type: DataTypes.JSON }, // Array of issues found
      suggestions: { type: DataTypes.JSON }, // Array of suggestions
      topicKeywordsFound: { type: DataTypes.JSON }, // Array of topic keywords found
    },
    { sequelize, modelName: "SegmentAnalysis", tableName: "SegmentAnalyses" },
  );

  return SegmentAnalysis;
};
