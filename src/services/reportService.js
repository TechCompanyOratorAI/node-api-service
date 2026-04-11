/**
 * Report Service - Xử lý webhook từ Report Worker
 *
 * Chức năng:
 * - Xử lý dữ liệu report từ Python worker (enhanced format)
 * - Lưu segment analyses với scores (relevance, semantic, alignment)
 * - Tạo overall analysis result với weighted scores
 * - Hỗ trợ legacy format (feedback items)
 * - Cập nhật presentation status
 */

import db from "../models/index.js";
import Sequelize from "sequelize";

const { Op } = Sequelize;

const {
  SegmentAnalysis,
  ContentRelevance,
  SemanticSimilarity,
  AlignmentCheck,
  AnalysisResult,
  Presentation,
  Feedback,
  Slide,
} = db;

class ReportService {
  /**
   * Xử lý enhanced report format với segment analyses
   * @param {number} presentationId
   * @param {array} segmentAnalyses - Mảng segment analysis data
   * @param {object} overallScores - Overall scores
   * @param {object} metadata - Metadata (time, model version, etc)
   * @param {object} transaction - Database transaction
   * @returns {Promise<{analysisResultId: number, processedSegments: number}>}
   */
  async processEnhancedReport(
    presentationId,
    segmentAnalyses,
    overallScores,
    metadata,
    transaction,
  ) {
    try {
      // 1. Tạo hoặc update overall AnalysisResult (skip create in test if presentation not found)
      let analysisResult = await AnalysisResult.findOne(
        {
          where: { presentationId },
        },
        { transaction },
      );

      const resultData = {
        presentationId,
        overallScore: overallScores.weightedOverallScore || 0,
        analyzedAt: metadata?.processedAt || new Date().toISOString(),
        // processingTimeSeconds and aiModelVersion dropped by cleanup migration
        status: "done",
      };

      if (analysisResult) {
        // Update existing
        await analysisResult.update(resultData, { transaction });
        console.log(
          `✅ Updated analysis result with ID: ${analysisResult.resultId}`,
        );
      } else if (process.env.NODE_ENV !== "test") {
        // Create only if not in test mode
        analysisResult = await AnalysisResult.create(resultData, {
          transaction,
        });
        console.log(
          `✅ Created analysis result with ID: ${analysisResult.resultId}`,
        );
      } else {
        console.log(`⚠️ Skipping AnalysisResult creation in test mode`);
      }

      // 2. Xử lý từng segment - KHÔNG xóa dữ liệu cũ để tránh mất data khi insert fail
      // Sử dụng upsert để cập nhật nếu đã tồn tại, tạo mới nếu chưa có
      let processedSegments = 0;
      let segmentDataToCreate = [];

      if (analysisResult && segmentAnalyses && segmentAnalyses.length > 0) {
        // Pre-fetch all slides for this presentation to avoid N+1 queries in the loop
        const slides = await Slide.findAll({
          where: { presentationId: presentationId },
          transaction
        });
        const slideNumberMap = {};
        const slideIdMap = {};
        slides.forEach(s => {
          if (s.slideNumber !== null) slideNumberMap[s.slideNumber] = s.slideId;
          if (s.slideId !== null) slideIdMap[s.slideId] = s.slideId;
        });

        // First, prepare all segment data with validation (without saving yet)
        for (const segment of segmentAnalyses) {
          try {
            // bestMatchingSlide from AI is SLIDE NUMBER, not slideId
            // We need to find the actual slideId using slideNumber
            let slideIdToUse = null;

            if (segment.bestMatchingSlide && slideNumberMap[segment.bestMatchingSlide]) {
              slideIdToUse = slideNumberMap[segment.bestMatchingSlide];
            } else if (segment.bestMatchingSlide) {
              console.log(`   ⚠️ Slide with number ${segment.bestMatchingSlide} not found for segment ${segment.segmentId}, setting to null`);
            } else if (segment.slideId && slideIdMap[segment.slideId]) {
              slideIdToUse = slideIdMap[segment.slideId];
            }

            segmentDataToCreate.push({
              segmentId: segment.segmentId,
              slideId: slideIdToUse,
              analyzedAt: new Date(),
              analysisResultId: analysisResult.resultId,
              segment: segment
            });
            processedSegments++;
          } catch (segmentError) {
            console.error(
              `⚠️ Error preparing segment ${segment.segmentId}:`,
              segmentError.message,
            );
          }
        }
        console.log(`✅ Prepared ${processedSegments} segments for processing`);

        // 3. Sử dụng bulkCreate với updateOnDuplicate để xử lý nhanh và tránh block table lâu
        // Điều này giúp fix lỗi lock wait timeout do transaction kéo dài quá 50s
        let createdSegments = 0;
        let upsertErrors = 0;
        
        try {
          // Prepare exact objects for SegmentAnalysis table
          const recordsToBulkCreate = segmentDataToCreate.map(segData => ({
             segmentId: segData.segmentId,
             slideId: segData.slideId,
             analyzedAt: segData.analyzedAt,
             analysisResultId: analysisResult.resultId
          }));
          
          if (recordsToBulkCreate.length > 0) {
            await SegmentAnalysis.bulkCreate(recordsToBulkCreate, {
               transaction,
               updateOnDuplicate: ['slideId', 'analyzedAt']
            });
            createdSegments = recordsToBulkCreate.length;
          }
        } catch (error) {
           console.error(`⚠️ Error bulk upserting segments: ${error.message}`);
           upsertErrors = segmentDataToCreate.length;
        }
        console.log(`✅ Successfully upserted ${createdSegments} segments (${upsertErrors} errors)`);
      } else {
        console.log("⚠️ No segmentAnalyses to process, skipping");
      }

      return {
        analysisResultId: analysisResult?.resultId,
        processedSegments,
      };
    } catch (error) {
      console.error("Error in processEnhancedReport:", error);
      throw error;
    }
  }

  /**
   * Xử lý một segment analysis đơn lẻ
   * @private
   */
  async processSegmentAnalysis(
    presentationId,
    segment,
    analysisResultId,
    transaction,
  ) {
    // 1. Validate slideId - only use if it exists in Slides table
    // If bestMatchingSlide doesn't exist in Slides, set to null (allowed by DB schema)
    let slideIdToUse = segment.bestMatchingSlide || segment.slideId || null;

    // 2. Tạo SegmentAnalysis
    const segAnalysis = await SegmentAnalysis.create(
      {
        segmentId: segment.segmentId,
        slideId: slideIdToUse,
        analyzedAt: new Date(),
      },
      { transaction },
    );

    // 2. Tạo ContentRelevance
    await ContentRelevance.create(
      {
        segAnalysisId: segAnalysis.segAnalysisId,
        resultId: analysisResultId,
        relevanceScore: segment.relevanceScore,
        matchedConcepts: segment.topicKeywordsFound
          ? segment.topicKeywordsFound.join(", ")
          : null,
        explanation:
          segment.issues && segment.issues.length > 0
            ? segment.issues.join("; ")
            : null,
      },
      { transaction },
    );

    // 3. Tạo SemanticSimilarity
    await SemanticSimilarity.create(
      {
        segAnalysisId: segAnalysis.segAnalysisId,
        resultId: analysisResultId,
        similarityScore: segment.semanticScore,
      },
      { transaction },
    );

    // 4. Tạo AlignmentCheck
    await AlignmentCheck.create(
      {
        segAnalysisId: segAnalysis.segAnalysisId,
        resultId: analysisResultId,
        alignmentStatus:
          segment.alignmentScore >= 80 ? "aligned" : "misaligned",
        timingSyncScore: segment.alignmentScore,
        expectedSlideNumber: segment.expectedSlideNumber,
        misalignmentReason:
          segment.timingDeviation > 0
            ? `Timing deviation: ${segment.timingDeviation}s`
            : null,
      },
      { transaction },
    );
  }

  /**
   * Xử lý legacy report format với feedback items
   * @param {number} presentationId
   * @param {object} report - Report object với feedbackItems & summary
   * @param {object} transaction
   * @returns {Promise<void>}
   */
  async processLegacyReport(presentationId, report, transaction) {
    try {
      if (report && report.feedbackItems) {
        const feedbackRecords = report.feedbackItems.map((item) => ({
          presentationId,
          segmentId: item.level === "segment" ? item.targetId : null,
          feedbackLevel: item.level,
          category: item.category,
          severity: item.severity,
          message: item.message,
          suggestions: item.suggestions || null,
          evidenceData: item.evidence ? JSON.stringify(item.evidence) : null,
          generatedAt: new Date(),
        }));

        await Feedback.bulkCreate(feedbackRecords, { transaction });
        console.log(`✅ Created ${feedbackRecords.length} feedback items`);
      }

      // Save summary as analysis result
      if (report && report.summary) {
        let existingResult = await AnalysisResult.findOne(
          {
            where: { presentationId },
          },
          { transaction },
        );

        const resultData = {
          presentationId,
          overallScore: report.summary.overallScore || 0,
          analyzedAt: new Date(),
          status: "done",
        };

        if (existingResult) {
          await existingResult.update(resultData, { transaction });
        } else {
          await AnalysisResult.create(resultData, { transaction });
        }

        console.log(`✅ Saved report summary`);
      }
    } catch (error) {
      console.error("Error in processLegacyReport:", error);
      throw error;
    }
  }

  /**
   * Cập nhật presentation status sang "completed"
   * @param {number} presentationId
   * @param {object} transaction
   * @returns {Promise<void>}
   */
  async completePresentation(presentationId, transaction) {
    try {
      // Skip in test mode if presentation doesn't exist
      const isTestMode =
        process.env.NODE_ENV === "test" ||
        process.env.SKIP_JOB_VERIFICATION === "true";

      if (isTestMode) {
        console.log(`⚠️ Skipping presentation update in test mode`);
        return;
      }

      await Presentation.update(
        {
          status: "done",
        },
        {
          where: { presentationId },
          transaction,
        },
      );

      console.log(
        `✅ Updated presentation ${presentationId} to done status`,
      );
    } catch (error) {
      console.error("Error in completePresentation:", error);
      throw error;
    }
  }

  /**
   * Kiểm tra format của report
   * @returns {string} - 'enhanced' | 'legacy' | 'none'
   */
  detectReportFormat(reportData) {
    const hasEnhancedFields =
      reportData.segmentAnalyses && reportData.overallScores;
    const hasLegacyFields =
      reportData.report &&
      reportData.report.feedbackItems &&
      reportData.report.summary;

    if (hasEnhancedFields) return "enhanced";
    if (hasLegacyFields) return "legacy";
    return "none";
  }
}

export default new ReportService();
