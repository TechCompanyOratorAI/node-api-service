/**
 * Speech Quality Routes - API endpoints for speech quality analysis data
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import db from "../models/index.js";

const router = express.Router();
const { SpeechQualityAnalysis, HesitationPattern, SegmentSpeechQuality, Presentation, TranscriptSegment } = db;

/**
 * GET /api/speech-quality/presentation/:id
 * Get speech quality analysis for a presentation
 */
router.get("/presentation/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if user has access to this presentation
    const presentation = await Presentation.findOne({
      where: { presentationId: id, userId: userId }
    });

    if (!presentation) {
      return res.status(404).json({
        success: false,
        message: "Presentation not found or access denied"
      });
    }

    // Get speech quality analysis
    const speechAnalysis = await SpeechQualityAnalysis.findOne({
      where: { presentationId: id },
      include: [
        {
          model: HesitationPattern,
          as: 'hesitationPatterns',
          order: [['startTime', 'ASC']]
        },
        {
          model: SegmentSpeechQuality,
          as: 'segmentQualities',
          include: [{
            model: TranscriptSegment,
            as: 'segment',
            attributes: ['segmentId', 'segmentNumber', 'segmentText', 'startTimestamp', 'endTimestamp']
          }]
        }
      ]
    });

    if (!speechAnalysis) {
      return res.status(404).json({
        success: false,
        message: "Speech quality analysis not found for this presentation"
      });
    }

    res.json({
      success: true,
      data: speechAnalysis
    });

  } catch (error) {
    console.error("Error fetching speech quality analysis:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * GET /api/speech-quality/presentation/:id/hesitation-patterns
 * Get detailed hesitation patterns for a presentation
 */
router.get("/presentation/:id/hesitation-patterns", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { type, minConfidence, minDuration } = req.query;

    // Check access
    const presentation = await Presentation.findOne({
      where: { presentationId: id, userId: userId }
    });

    if (!presentation) {
      return res.status(404).json({
        success: false,
        message: "Presentation not found or access denied"
      });
    }

    // Build where clause for filtering
    const whereClause = {};
    if (type) {
      whereClause.patternType = type;
    }
    if (minConfidence) {
      whereClause.confidence = { [db.Sequelize.Op.gte]: parseFloat(minConfidence) };
    }
    if (minDuration) {
      whereClause.duration = { [db.Sequelize.Op.gte]: parseFloat(minDuration) };
    }

    // Get hesitation patterns
    const patterns = await HesitationPattern.findAll({
      include: [{
        model: SpeechQualityAnalysis,
        as: 'speechAnalysis',
        where: { presentationId: id },
        attributes: []
      }, {
        model: TranscriptSegment,
        as: 'segment',
        attributes: ['segmentId', 'segmentNumber', 'segmentText', 'startTimestamp', 'endTimestamp']
      }],
      where: whereClause,
      order: [['startTime', 'ASC']]
    });

    // Group by pattern type for summary
    const summary = {
      total: patterns.length,
      byType: {},
      totalDuration: 0,
      avgConfidence: 0
    };

    patterns.forEach(pattern => {
      const type = pattern.patternType;
      if (!summary.byType[type]) {
        summary.byType[type] = { count: 0, duration: 0 };
      }
      summary.byType[type].count++;
      summary.byType[type].duration += parseFloat(pattern.duration);
      summary.totalDuration += parseFloat(pattern.duration);
    });

    if (patterns.length > 0) {
      summary.avgConfidence = patterns.reduce((sum, p) => sum + parseFloat(p.confidence), 0) / patterns.length;
    }

    res.json({
      success: true,
      data: {
        patterns: patterns,
        summary: summary
      }
    });

  } catch (error) {
    console.error("Error fetching hesitation patterns:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * GET /api/speech-quality/presentation/:id/segment-quality
 * Get segment-level speech quality data
 */
router.get("/presentation/:id/segment-quality", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check access
    const presentation = await Presentation.findOne({
      where: { presentationId: id, userId: userId }
    });

    if (!presentation) {
      return res.status(404).json({
        success: false,
        message: "Presentation not found or access denied"
      });
    }

    // Get segment speech quality data
    const segmentQualities = await SegmentSpeechQuality.findAll({
      include: [{
        model: SpeechQualityAnalysis,
        as: 'speechAnalysis',
        where: { presentationId: id },
        attributes: ['id', 'overallScore', 'analyzedAt']
      }, {
        model: TranscriptSegment,
        as: 'segment',
        attributes: ['segmentId', 'segmentNumber', 'segmentText', 'startTimestamp', 'endTimestamp']
      }],
      order: [['segment', 'segmentNumber', 'ASC']]
    });

    res.json({
      success: true,
      data: segmentQualities
    });

  } catch (error) {
    console.error("Error fetching segment speech quality:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * GET /api/speech-quality/presentation/:id/summary
 * Get speech quality summary for a presentation
 */
router.get("/presentation/:id/summary", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check access
    const presentation = await Presentation.findOne({
      where: { presentationId: id, userId: userId }
    });

    if (!presentation) {
      return res.status(404).json({
        success: false,
        message: "Presentation not found or access denied"
      });
    }

    // Get speech quality analysis with aggregated data
    const speechAnalysis = await SpeechQualityAnalysis.findOne({
      where: { presentationId: id },
      attributes: [
        'fluencyScore', 'clarityScore', 'confidenceScore', 'overallScore',
        'totalHesitationCount', 'totalHesitationTime', 'hesitationRate',
        'audioDuration', 'speakingRate', 'silenceRatio', 'voicedRatio',
        'analyzedAt'
      ]
    });

    if (!speechAnalysis) {
      return res.status(404).json({
        success: false,
        message: "Speech quality analysis not found"
      });
    }

    // Get hesitation pattern breakdown
    const hesitationBreakdown = await HesitationPattern.findAll({
      include: [{
        model: SpeechQualityAnalysis,
        as: 'speechAnalysis',
        where: { presentationId: id },
        attributes: []
      }],
      attributes: [
        'patternType',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('duration')), 'totalDuration'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('confidence')), 'avgConfidence']
      ],
      group: ['patternType']
    });

    // Calculate quality grade
    const overallScore = parseFloat(speechAnalysis.overallScore) || 0;
    let grade = 'F';
    if (overallScore >= 0.9) grade = 'A';
    else if (overallScore >= 0.8) grade = 'B';
    else if (overallScore >= 0.7) grade = 'C';
    else if (overallScore >= 0.6) grade = 'D';

    const summary = {
      scores: {
        fluency: speechAnalysis.fluencyScore,
        clarity: speechAnalysis.clarityScore,
        confidence: speechAnalysis.confidenceScore,
        overall: speechAnalysis.overallScore,
        grade: grade
      },
      hesitations: {
        total: speechAnalysis.totalHesitationCount,
        totalTime: speechAnalysis.totalHesitationTime,
        rate: speechAnalysis.hesitationRate,
        breakdown: hesitationBreakdown
      },
      speech: {
        duration: speechAnalysis.audioDuration,
        speakingRate: speechAnalysis.speakingRate,
        silenceRatio: speechAnalysis.silenceRatio,
        voicedRatio: speechAnalysis.voicedRatio
      },
      analyzedAt: speechAnalysis.analyzedAt
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error("Error fetching speech quality summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;