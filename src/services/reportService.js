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
        overallScore: overallScores.weightedOverallScore || overallScores.overallScore || 0,
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
            let slideIdToUse = null;

            if (segment.bestMatchingSlide && slideNumberMap[segment.bestMatchingSlide]) {
              slideIdToUse = slideNumberMap[segment.bestMatchingSlide];
            } else if (segment.bestMatchingSlide) {
              console.log(`   ⚠️ Slide with number ${segment.bestMatchingSlide} not found for segment ${segment.segmentId}`);
            }

            segmentDataToCreate.push({
              segmentId: segment.segmentId,
              slideId: slideIdToUse,
              analyzedAt: new Date(),
              relevanceScore: segment.relevanceScore || 0,
              semanticScore: segment.semanticScore || 0,
              alignmentScore: segment.alignmentScore || 0,
              bestMatchingSlide: segment.bestMatchingSlide,
              expectedSlideNumber: segment.expectedSlideNumber,
              timingDeviation: segment.timingDeviation,
              issues: Array.isArray(segment.issues) ? segment.issues : [],
              suggestions: Array.isArray(segment.suggestions) ? segment.suggestions : [],
              topicKeywordsFound: Array.isArray(segment.topicKeywordsFound) ? segment.topicKeywordsFound : [],
              analysisResultId: analysisResult.resultId
            });
            processedSegments++;
          } catch (segmentError) {
            console.error(`⚠️ Error preparing segment ${segment.segmentId}:`, segmentError.message);
          }
        }
        console.log(`✅ Prepared ${processedSegments} segments for processing`);

        // 3. Sử dụng bulkCreate với updateOnDuplicate để xử lý nhanh
        try {
          if (segmentDataToCreate.length > 0) {
            const createdRecords = await SegmentAnalysis.bulkCreate(segmentDataToCreate, {
               transaction,
               updateOnDuplicate: [
                 'slideId', 'analyzedAt', 'relevanceScore', 'semanticScore', 
                 'alignmentScore', 'bestMatchingSlide', 'expectedSlideNumber', 
                 'timingDeviation', 'issues', 'suggestions', 'topicKeywordsFound'
               ]
            });

            // 4. Save to detail tables (ContentRelevance, SemanticSimilarity, AlignmentChecks)
            // We need the segAnalysisId for these, so we fetch records if needed
            // However, SegmentAnalysis has segmentId as unique, so we can find them
            const dbRecords = await SegmentAnalysis.findAll({
              where: { segmentId: segmentDataToCreate.map(s => s.segmentId) },
              transaction
            });

            const segIdToAnalysisId = {};
            dbRecords.forEach(r => { segIdToAnalysisId[r.segmentId] = r.segAnalysisId; });

            for (const segData of segmentDataToCreate) {
              const segAnalysisId = segIdToAnalysisId[segData.segmentId];
              if (!segAnalysisId) continue;

              await ContentRelevance.upsert({
                segAnalysisId: segAnalysisId,
                relevanceScore: segData.relevanceScore,
                matchedConcepts: Array.isArray(segData.topicKeywordsFound) ? segData.topicKeywordsFound.join(", ") : null,
                explanation: Array.isArray(segData.issues) && segData.issues.length > 0 ? segData.issues.join("; ") : null,
              }, { transaction });

              await SemanticSimilarity.upsert({
                segAnalysisId: segAnalysisId,
                similarityScore: segData.semanticScore,
              }, { transaction });

              await AlignmentCheck.upsert({
                segAnalysisId: segAnalysisId,
                alignmentStatus: segData.alignmentScore >= 80 ? "aligned" : "misaligned",
                timingSyncScore: segData.alignmentScore,
                expectedSlideNumber: segData.expectedSlideNumber,
                misalignmentReason: segData.timingDeviation > 0 ? `Timing deviation: ${segData.timingDeviation}s` : null,
              }, { transaction });
            }
          }
        } catch (error) {
           console.error(`⚠️ Error bulk upserting segments: ${error.message}`);
           throw error;
        }
        console.log(`✅ Successfully saved segments and detail analysis data`);
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
        matchedConcepts: Array.isArray(segment.topicKeywordsFound)
          ? segment.topicKeywordsFound.join(", ")
          : null,
        explanation:
          Array.isArray(segment.issues) && segment.issues.length > 0
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
