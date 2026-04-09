/**
 * Webhook Controller - Receive callbacks from Python workers
 *
 * Endpoints:
 * - POST /webhooks/asr-complete - ASR & diarization complete
 * - POST /webhooks/analysis-complete - Analysis complete
 * - POST /webhooks/report-complete - Report generation complete
 *
 * Security: WEBHOOK_SECRET authentication
 */

import jobService from "../services/jobService.js";
import speakerService from "../services/speakerService.js";
import reportService from "../services/reportService.js";
import aiReportService from "../services/aiReportService.js";
import db from "../models/index.js";

const {
  Transcript,
  TranscriptSegment,
  Speaker,
  Feedback,
  AnalysisResult,
  Presentation,
  SegmentAnalysis,
  ContentRelevance,
  SemanticSimilarity,
  AlignmentCheck,
  Slide,
  SpeechQualityAnalysis,
  HesitationPattern,
  SegmentSpeechQuality,
} = db;

/**
 * Middleware: Verify webhook authentication
 */
const verifyWebhookAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn(
      "⚠️ WEBHOOK_SECRET not configured - webhook authentication disabled",
    );
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Missing authorization header",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  if (token !== webhookSecret) {
    console.error("❌ Invalid webhook token");
    return res.status(403).json({
      success: false,
      message: "Invalid webhook token",
    });
  }

  next();
};

/**
 * POST /webhooks/asr-complete
 * Called by ASR worker when transcription & diarization complete
 *
 * Payload:
 * {
 *   jobId: number,
 *   presentationId: number,
 *   status: 'success' | 'failed',
 *   error?: string,
 *   transcript?: {
 *     fullText: string,
 *     language: string,
 *     segments: [{
 *       order: number,
 *       startTimestamp: number,
 *       endTimestamp: number,
 *       text: string,
 *       confidence?: number
 *     }]
 *   },
 *   diarization?: {
 *     speakers: [{
 *       aiSpeakerLabel: string,
 *       segments: [{startTime, endTime}],
 *       metadata?: object
 *     }],
 *     segmentSpeakerMappings: [{segmentId, aiSpeakerLabel}]
 *   }
 * }
 */
const asrComplete = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { jobId, presentationId, status, error, transcript, diarization } =
      req.body;

    console.log(
      `📥 Webhook: ASR complete for job ${jobId}, presentation ${presentationId}, status: ${status}`,
    );

    // Validate required fields
    if (!jobId || !presentationId || !status) {
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("❌ Transaction rollback failed:", rollbackError);
        }
      }
      return res.status(400).json({
        success: false,
        message: "Missing required fields: jobId, presentationId, status",
      });
    }

    // Get job (getJobById throws error if not found, so wrap in try-catch)
    let job;
    try {
      job = await jobService.getJobById(jobId);
    } catch (jobError) {
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("❌ Transaction rollback failed:", rollbackError);
        }
      }
      console.error(`⚠️ Job not found: ${jobId}`);

      // Still process the webhook data even if job record is missing
      // This handles cases where job was created but not yet synced
      console.log(
        `⚠️ Processing webhook without job validation for presentation ${presentationId}`,
      );
      job = null; // Continue processing
    }

    // Handle failure
    if (status === "failed") {
      // Try to mark job as failed, but don't fail if job doesn't exist
      if (job) {
        try {
          await jobService.markJobFailed(jobId, error || "ASR failed", true);
        } catch (jobError) {
          console.error(
            `⚠️ Failed to mark job ${jobId} as failed:`,
            jobError.message,
          );
        }
      }

      await Presentation.update(
        { status: "failed" },
        { where: { presentationId }, transaction },
      );

      await transaction.commit();

      return res.json({
        success: true,
        message: "ASR failure recorded",
      });
    }

    // Handle success - Save transcript
    if (transcript && transcript.segments) {
      // Get presentation with audioRecord to retrieve audioId
      const presentation = await Presentation.findByPk(presentationId, {
        include: [{ model: db.AudioRecord, as: "audioRecord" }],
        transaction,
      });

      if (!presentation) {
        throw new Error(`Presentation not found: ${presentationId}`);
      }

      if (!presentation.audioRecord) {
        throw new Error(
          `No audio record found for presentation ${presentationId}`,
        );
      }

      const audioId = presentation.audioRecord.audioId;

      // Create or update transcript record
      let transcriptRecord = await Transcript.findOne({
        where: { presentationId },
        transaction,
      });

      if (transcriptRecord) {
        await transcriptRecord.update(
          {
            audioId,
            fullTranscript: transcript.fullText,
            language: transcript.language || "vi",
          },
          { transaction },
        );
      } else {
        transcriptRecord = await Transcript.create(
          {
            presentationId,
            audioId,
            fullTranscript: transcript.fullText,
            language: transcript.language || "vi",
            generatedAt: new Date(),
          },
          { transaction },
        );
      }

      // Delete old segments if exists
      await TranscriptSegment.destroy({
        where: { transcriptId: transcriptRecord.transcriptId },
        transaction,
      });

      // Create transcript segments
      const segments = transcript.segments.map((seg) => ({
        transcriptId: transcriptRecord.transcriptId,
        segmentNumber: seg.order,
        startTimestamp: seg.startTimestamp,
        endTimestamp: seg.endTimestamp,
        segmentText: seg.text,
        confidenceScore: seg.confidence || null,
        speakerId: null, // Will be linked later in diarization
      }));

      const createdSegments = await TranscriptSegment.bulkCreate(segments, {
        transaction,
        returning: true,
      });

      console.log(
        `✅ Created transcript with ${createdSegments.length} segments`,
      );

      // Commit transcript and segments immediately to avoid timeout rollback
      await transaction.commit();
      console.log(`✅ Transcript transaction committed`);
    }

    // Process diarization if available (outside main transaction)
    if (
      transcript &&
      transcript.segments &&
      diarization &&
      diarization.speakers
    ) {
      try {
        // Create speakers from diarization
        const speakers = await speakerService.createSpeakersFromDiarization(
          presentationId,
          diarization.speakers,
        );

        console.log(`✅ Created ${speakers.length} speakers from diarization`);

        // Link segments to speakers
        if (diarization.segmentSpeakerMappings) {
          // Get transcript to get segment IDs
          const transcriptRecord = await Transcript.findOne({
            where: { presentationId },
            include: [{ model: TranscriptSegment, as: "segments" }],
          });

          if (transcriptRecord && transcriptRecord.segments) {
            // Map segment order to segmentId
            const segmentIdMap = {};
            transcriptRecord.segments.forEach((seg) => {
              segmentIdMap[seg.segmentNumber] = seg.segmentId;
            });

            // Convert mappings to use segmentId instead of order
            const mappingsWithIds = diarization.segmentSpeakerMappings
              .map((m) => ({
                segmentId: segmentIdMap[m.order] || m.segmentId,
                aiSpeakerLabel: m.aiSpeakerLabel,
              }))
              .filter((m) => m.segmentId); // Filter out invalid mappings

            await speakerService.linkSegmentsToSpeakers(
              presentationId,
              mappingsWithIds,
            );

            console.log(`✅ Linked segments to speakers`);
          }
        }
      } catch (diarizationError) {
        console.error(
          "⚠️ Diarization processing error (transcript saved):",
          diarizationError,
        );
        // Don't fail the whole request - transcript is already saved
      }
    }

    // Enqueue semantic job for py-semantic-worker
    try {
      // Get audio filename for speech quality analysis
      // console.log(`🔍 DEBUG: Fetching presentation ${presentationId} with audioRecord...`);
      const presentation = await Presentation.findByPk(presentationId, {
        include: ["audioRecord"],
      });
      
      console.log(`🔍 DEBUG: Presentation found:`, {
        presentationId: presentation?.presentationId,
        hasAudioRecord: !!presentation?.audioRecord,
        audioRecordId: presentation?.audioRecord?.audioId,
        audioFileName: presentation?.audioRecord?.fileName,
      });
      
      let s3AudioKey = null;
      if (presentation?.audioRecord?.filePath) {
        try {
          if (presentation.audioRecord.filePath.startsWith('http')) {
            const url = new URL(presentation.audioRecord.filePath);
            s3AudioKey = url.pathname.substring(1); // Remove leading slash
          } else {
            s3AudioKey = presentation.audioRecord.filePath;
          }
        } catch (e) {
          s3AudioKey = presentation.audioRecord.fileName || null;
        }
      } else {
        s3AudioKey = presentation?.audioRecord?.fileName || null;
      }
      
      // console.log(`🔍 DEBUG: audioFilename extracted:`, {
      //   audioFilename: s3AudioKey,
      //   type: typeof s3AudioKey,
      //   isNull: s3AudioKey === null,
      // });
      
      const semanticJobMetadata = {
        transcriptSegments: transcript?.segments?.length || 0,
        uniqueSpeakers: diarization?.speakers?.length || 0,
        asrJobId: jobId,
        audioFilename: s3AudioKey,  // 🎤 Pass audio filename/key for speech quality analysis
      };
      
      console.log(`🔍 DEBUG: Creating semantic job with metadata:`, JSON.stringify(semanticJobMetadata, null, 2));
      
      const semanticJob = await jobService.createJob(
        presentationId,
        "semantic",
        semanticJobMetadata,
      );
      
      console.log(`🔍 DEBUG: Semantic job created:`, {
        jobId: semanticJob.jobId,
        metadata: semanticJob.metadata,
      });
      
      console.log(
        `✅ Semantic job ${semanticJob.jobId} enqueued for presentation ${presentationId}`,
      );
      if (s3AudioKey) {
        console.log(`   - Audio filename for speech quality: ${s3AudioKey}`);
      } else {
        console.log(`   ⚠️ WARNING: No audio filename found for speech quality analysis`);
      }
    } catch (enqueueError) {
      console.error("⚠️ Failed to enqueue semantic job:", enqueueError);
      console.error("Error stack:", enqueueError.stack);
      // Don't fail the request - ASR completed successfully
    }

    // Mark job as completed (skip if job doesn't exist)
    if (job) {
      try {
        await jobService.markJobCompleted(jobId, {
          transcriptCreated: true,
          segmentCount: transcript?.segments?.length || 0,
          speakerCount: diarization?.speakers?.length || 0,
        });
      } catch (jobError) {
        console.error(
          `⚠️ Failed to mark job ${jobId} as completed:`,
          jobError.message,
        );
      }
    }

    console.log(`✅ ASR webhook processed successfully for job ${jobId}`);

    return res.json({
      success: true,
      message: "ASR results saved successfully",
      data: {
        jobId,
        presentationId,
        transcriptSegments: transcript?.segments?.length || 0,
        speakers: diarization?.speakers?.length || 0,
      },
    });
  } catch (error) {
    // Only rollback if transaction is still pending (not committed yet)
    if (!transaction.finished) {
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("❌ Transaction rollback failed:", rollbackError);
        }
      }
    }
    console.error("❌ ASR webhook error:", error);

    // Try to mark job as failed
    try {
      if (req.body.jobId) {
        await jobService.markJobFailed(
          req.body.jobId,
          `Webhook processing error: ${error.message}`,
          false,
        );
      }
    } catch (jobError) {
      console.error("Failed to mark job as failed:", jobError);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process ASR webhook",
      error: error.message,
    });
  }
};

/**
 * POST /webhooks/analysis-complete
 * Called by Analysis worker when content analysis complete
 *
 * Payload:
 * {
 *   jobId: number,
 *   presentationId: number,
 *   status: 'success' | 'failed',
 *   error?: string,
 *   analysis?: {
 *     segmentAnalyses: [{
 *       segmentId: number,
 *       relevanceScore: number,
 *       semanticScore: number,
 *       alignmentScore: number,
 *       issues: string[]
 *     }],
 *     overallScores: {
 *       contentRelevance: number,
 *       semanticSimilarity: number,
 *       slideAlignment: number
 *     },
 *     metadata?: object
 *   }
 * }
 */
// Cache for processed requests (in-memory for simplicity)
const processedRequests = new Map();

const analysisComplete = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { jobId, presentationId, status, error, analysis } = req.body;

    // Check for speech quality data early (outside transaction scope)
    const hasSpeechQuality =
      analysis?.overallScores &&
      (analysis.overallScores.speechFluency !== undefined ||
        analysis.overallScores.speechClarity !== undefined ||
        analysis.overallScores.speechConfidence !== undefined);
    const idempotencyKey = req.headers["idempotency-key"];

    console.log(
      `📥 Webhook: Analysis complete for job ${jobId}, presentation ${presentationId}, status: ${status}`,
    );
    
    console.log(
      `📥 Webhook: Analysis complete for job ${jobId}, presentation ${presentationId}, status: ${status}`,
    );

    // Check for idempotency key to prevent duplicate processing
    if (idempotencyKey && processedRequests.has(idempotencyKey)) {
      console.log(
        `🔄 Duplicate request detected for key: ${idempotencyKey}, returning cached response`,
      );
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("❌ Transaction rollback failed:", rollbackError);
        }
      }
      return res.json(processedRequests.get(idempotencyKey));
    }

    if (!jobId || !presentationId || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const job = await jobService.getJobById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job not found: ${jobId}`,
      });
    }

    // Check if job is already completed to prevent duplicate processing
    if (job.status === "completed") {
      console.log(`⚠️ Job ${jobId} is already completed, skipping processing`);
      const response = {
        success: true,
        message: "Job already completed",
        data: { jobId, presentationId },
      };

      // Cache response for idempotency
      if (idempotencyKey) {
        processedRequests.set(idempotencyKey, response);
        setTimeout(() => processedRequests.delete(idempotencyKey), 3600000);
      }

      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("❌ Transaction rollback failed:", rollbackError);
        }
      }
      return res.json(response);
    }

    // Handle failure
    if (status === "failed") {
      await jobService.markJobFailed(jobId, error || "Analysis failed", true);
      await transaction.commit();

      return res.json({
        success: true,
        message: "Analysis failure recorded",
      });
    }

    // Handle success - Save analysis results
    if (analysis) {
      console.log(
        `📊 Saving analysis results for presentation ${presentationId}`,
      );
      console.log(
        `📊 Analysis payload: segmentAnalyses count = ${analysis.segmentAnalyses ? analysis.segmentAnalyses.length : 0}`,
      );
      console.log(
        `📊 First segment sample:`,
        analysis.segmentAnalyses && analysis.segmentAnalyses[0]
          ? JSON.stringify(analysis.segmentAnalyses[0])
          : "null",
      );

      // Save segment-level analyses using findOrCreate to handle duplicates
      if (analysis.segmentAnalyses && analysis.segmentAnalyses.length > 0) {
        let createdCount = 0;
        let updatedCount = 0;

        for (const segAnalysis of analysis.segmentAnalyses) {
          // Find slideId based on bestMatchingSlide
          let slideId = null;
          if (segAnalysis.bestMatchingSlide) {
            const slide = await Slide.findOne({
              where: {
                presentationId: presentationId,
                slideNumber: segAnalysis.bestMatchingSlide,
              },
            });
            slideId = slide ? slide.slideId : null;
          }

          // Use findOrCreate to handle duplicates - update if exists, create if not
          // Only use segmentId as unique key since slideId can change between analyses
          const [segmentAnalysisRecord, created] =
            await SegmentAnalysis.findOrCreate({
              where: {
                segmentId: segAnalysis.segmentId,
              },
              defaults: {
                slideId: slideId,
                configId: null,
                relevanceScore: segAnalysis.relevanceScore,
                semanticScore: segAnalysis.semanticScore,
                alignmentScore: segAnalysis.alignmentScore,
                bestMatchingSlide: segAnalysis.bestMatchingSlide,
                expectedSlideNumber: segAnalysis.expectedSlideNumber,
                timingDeviation: segAnalysis.timingDeviation,
                issues: segAnalysis.issues || [],
                suggestions: segAnalysis.suggestions || [],
                topicKeywordsFound: segAnalysis.topicKeywordsFound || [],
                analyzedAt: new Date(),
              },
              transaction,
            });

          // If record already exists, update it with new values
          if (!created) {
            await segmentAnalysisRecord.update(
              {
                slideId: slideId,
                configId: null,
                relevanceScore: segAnalysis.relevanceScore,
                semanticScore: segAnalysis.semanticScore,
                alignmentScore: segAnalysis.alignmentScore,
                bestMatchingSlide: segAnalysis.bestMatchingSlide,
                expectedSlideNumber: segAnalysis.expectedSlideNumber,
                timingDeviation: segAnalysis.timingDeviation,
                issues: segAnalysis.issues || [],
                suggestions: segAnalysis.suggestions || [],
                topicKeywordsFound: segAnalysis.topicKeywordsFound || [],
                analyzedAt: new Date(),
              },
              { transaction },
            );
            updatedCount++;
          } else {
            createdCount++;
          }

  
          try {
            await ContentRelevance.upsert(
              {
                segAnalysisId: segmentAnalysisRecord.segAnalysisId,
                relevanceScore: segAnalysis.relevanceScore || 0,
                matchedConcepts: segAnalysis.topicKeywordsFound
                  ? segAnalysis.topicKeywordsFound.join(", ")
                  : null,
                explanation:
                  segAnalysis.issues && segAnalysis.issues.length > 0
                    ? segAnalysis.issues.join("; ")
                    : null,
              },
              { transaction },
            );

            await SemanticSimilarity.upsert(
              {
                segAnalysisId: segmentAnalysisRecord.segAnalysisId,
                similarityScore: segAnalysis.semanticScore || 0,
              },
              { transaction },
            );

            await AlignmentCheck.upsert(
              {
                segAnalysisId: segmentAnalysisRecord.segAnalysisId,
                alignmentStatus:
                  segAnalysis.alignmentScore >= 80 ? "aligned" : "misaligned",
                timingSyncScore: segAnalysis.alignmentScore || 0,
                expectedSlideNumber: segAnalysis.expectedSlideNumber,
                misalignmentReason:
                  segAnalysis.timingDeviation > 0
                    ? `Timing deviation: ${segAnalysis.timingDeviation}s`
                    : null,
              },
              { transaction },
            );
          } catch (upsertError) {
            console.error(`   ❌ Failed to upsert detail tables: ${upsertError.message}`);
          }
        }

        console.log(
          `✅ Processed ${analysis.segmentAnalyses.length} segment analyses (${createdCount} created, ${updatedCount} updated)`,
        );
      }

      // Save overall analysis result using upsert
      const [analysisResult, created] = await AnalysisResult.upsert(
        {
          presentationId,
          configId: null,
          overallScore: analysis.overallScores?.overallScore || 0,
          analyzedAt: new Date(),
          status: "done",
        },
        { transaction },
      );

      console.log(
        `✅ ${created ? "Created" : "Updated"} overall analysis result`,
      );

      // Note: Speech quality analysis will be saved after main transaction
      if (hasSpeechQuality) {
        console.log(
          `🎤 Speech quality data detected for presentation ${presentationId}`,
        );
      }
    }

    // Commit transaction before marking job completed to release locks
    await transaction.commit();

    // Mark job as completed
    await jobService.markJobCompleted(jobId, {
      analysisCreated: true,
      segmentAnalysisCount: analysis?.segmentAnalyses?.length || 0,
    });

    console.log(`✅ Analysis webhook processed successfully for job ${jobId}`);

    // Process speech quality analysis in separate transaction (non-blocking)
    if (hasSpeechQuality) {
      console.log(
        `🎤 Starting speech quality analysis processing for presentation ${presentationId}`,
      );

      // Use separate transaction for speech quality to avoid blocking main response
      try {
        await db.sequelize.transaction(async (speechTransaction) => {
          await saveSpeechQualityAnalysis(
            presentationId,
            jobId,
            analysis,
            speechTransaction,
          );
        });
        console.log(
          `✅ Speech quality analysis completed for presentation ${presentationId}`,
        );
      } catch (speechError) {
        console.error(
          `❌ Speech quality analysis failed for presentation ${presentationId}:`,
          speechError,
        );
        // Don't fail the main response - speech quality is supplementary data
      }
    }

    // ============================================================
    // Trigger AI Report Generation (Rubric-based)
    // After semantic analysis completes, check if we should generate AI report
    // ============================================================
    
    // Initialize response object early to avoid undefined errors
    let responseData = {
      jobId,
      presentationId,
      segmentAnalyses: analysis?.segmentAnalyses?.length || 0,
      speechQualityProcessed: hasSpeechQuality,
    };
    
    try {
      console.log(
        `🤖 Checking if AI report should be generated for presentation ${presentationId}`,
      );

      const reportResult = await aiReportService.triggerReportAfterAnalysis(
        presentationId,
        jobId,
      );

      if (reportResult.success && !reportResult.skipped) {
        console.log(
          `✅ AI report generation triggered for presentation ${presentationId}, reportId: ${reportResult.reportId}`,
        );
        responseData.aiReportId = reportResult.reportId;
        responseData.aiReportTriggered = true;
      } else if (reportResult.skipped) {
        console.log(
          `ℹ️ AI report skipped for presentation ${presentationId}: ${reportResult.message}`,
        );
        responseData.aiReportSkipped = true;
        responseData.aiReportSkipReason = reportResult.message;
      } else {
        console.error(
          `⚠️ Failed to trigger AI report for presentation ${presentationId}:`,
          reportResult.message,
        );
      }
    } catch (reportError) {
      // Don't fail the main response - report generation is optional
      console.error(
        `❌ Error triggering AI report for presentation ${presentationId}:`,
        reportError,
      );
    }

    const response = {
      success: true,
      message: "Analysis results saved successfully",
      data: responseData,
    };

    // Cache the response for idempotency
    if (idempotencyKey) {
      processedRequests.set(idempotencyKey, response);
      // Clean up old entries after 1 hour to prevent memory leaks
      setTimeout(() => processedRequests.delete(idempotencyKey), 3600000);
    }

    return res.json(response);
  } catch (error) {
    // Only rollback if transaction is still active
    if (transaction && !transaction.finished) {
      try {
        if (transaction && !transaction.finished) {
          try {
            await transaction.rollback();
          } catch (rollbackError) {
            console.error("❌ Transaction rollback failed:", rollbackError);
          }
        }
      } catch (rollbackError) {
        console.error("❌ Transaction rollback failed:", rollbackError);
      }
    }
    console.error("❌ Analysis webhook error:", error);

    try {
      if (req.body.jobId) {
        await jobService.markJobFailed(
          req.body.jobId,
          `Webhook processing error: ${error.message}`,
          false,
        );
      }
    } catch (jobError) {
      console.error("Failed to mark job as failed:", jobError);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process analysis webhook",
      error: error.message,
    });
  }
};

/**
 * POST /webhooks/report-complete
 * Called by Report worker when feedback report generation complete
 *
 * Payload (Format 1 - Legacy):
 * {
 *   jobId: number,
 *   presentationId: number,
 *   status: 'success' | 'failed',
 *   error?: string,
 *   report?: {
 *     feedbackItems: [{...}],
 *     summary: {...}
 *   }
 * }
 *
 * Payload (Format 2 - New Enhanced):
 * {
 *   jobId: number,
 *   presentationId: number,
 *   status: 'completed' | 'failed',
 *   segmentAnalyses: [{
 *     segmentId: number,
 *     slideId: number,
 *     relevanceScore: number,
 *     semanticScore: number,
 *     alignmentScore: number,
 *     bestMatchingSlide: number,
 *     expectedSlideNumber: number,
 *     timingDeviation: number,
 *     issues: string[],
 *     suggestions: string[],
 *     topicKeywordsFound: string[]
 *   }],
 *   overallScores: {
 *     averageRelevanceScore: number,
 *     averageSemanticScore: number,
 *     averageAlignmentScore: number,
 *     weightedOverallScore: number,
 *     processingTimeSeconds: number,
 *     aiModelVersion: string
 *   },
 *   metadata: {
 *     totalSegments: number,
 *     totalSlides: number,
 *     processedAt: string
 *   }
 * }
 */
const reportComplete = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      jobId,
      presentationId,
      reportId,
      status,
      error,
      report,
      segmentAnalyses,
      overallScores,
      rubricScores,
      metadata,
    } = req.body;

    console.log(
      `📥 Webhook: Report complete for job ${jobId}, presentation ${presentationId}, report ${reportId}, status: ${status}`,
    );

    // Validate required fields
    if (!jobId || !presentationId || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: jobId, presentationId, status",
      });
    }

    // Verify job exists (skip in test/dev mode or if explicitly disabled)
    let job = null;
    const skipJobCheck =
      process.env.SKIP_JOB_VERIFICATION === "true" || !process.env.NODE_ENV;
    if (!skipJobCheck) {
      job = await jobService.getJobById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: `Job not found: ${jobId}`,
        });
      }
    } else {
      console.log(
        `⚠️ Skipping job verification (dev mode or disabled via env)`,
      );
    }

    // Handle failure status
    if (status === "failed") {
      await jobService.markJobFailed(
        jobId,
        error || "Report generation failed",
        true,
      );
      await transaction.commit();

      return res.json({
        success: true,
        message: "Report failure recorded",
      });
    }

    // Handle success - Detect and process report format
    const reportFormat = reportService.detectReportFormat({
      segmentAnalyses,
      overallScores,
      report,
    });

    console.log(`📋 Processing report format: ${reportFormat}`);

    // Debug: Log segmentAnalyses info
    console.log(`📊 segmentAnalyses: ${segmentAnalyses ? segmentAnalyses.length : 0} items`);

    let responseData = {
      jobId,
      presentationId,
      reportFormat,
    };

    if (reportFormat === "enhanced") {
      // Process enhanced format with segment analyses
      const result = await reportService.processEnhancedReport(
        presentationId,
        segmentAnalyses,
        overallScores,
        metadata,
        transaction,
      );

      // Add detailed scores
      responseData.analysisResultId = result.analysisResultId;
      responseData.segmentCount = result.processedSegments;
      responseData.scores = {
        relevance: overallScores.averageRelevanceScore,
        semantic: overallScores.averageSemanticScore,
        alignment: overallScores.averageAlignmentScore,
        weighted: overallScores.weightedOverallScore,
      };
      responseData.processingMetrics = {
        processingTimeSeconds: overallScores.processingTimeSeconds,
        aiModelVersion: overallScores.aiModelVersion,
      };
      responseData.metadata = {
        totalSegments: metadata?.totalSegments,
        totalSlides: metadata?.totalSlides,
        processedAt: metadata?.processedAt,
      };

      // ============================================================
      // Update AIReport with rubric scores if reportId provided
      // ============================================================
      if (reportId && rubricScores) {
        try {
          const aiReport = await db.AIReport.findOne({
            where: { reportId: reportId }
          });

          if (aiReport) {
            // Prepare report content from rubric scores
            let reportContent = "";
            if (rubricScores && Object.keys(rubricScores).length > 0) {
              reportContent = "BÁO CÁO ĐÁNH GIÁ AI\n\n";
              reportContent += `Điểm tổng: ${overallScores.weightedOverallScore || overallScores.overallScore || 0}\n\n`;

              for (const [criteriaId, cs] of Object.entries(rubricScores)) {
                reportContent += `${cs.criteriaName}: ${cs.score}/${cs.maxScore}\n`;
                if (cs.comment) {
                  reportContent += `  - Nhận xét: ${cs.comment}\n`;
                }
                if (cs.suggestions && cs.suggestions.length > 0) {
                  reportContent += `  - Gợi ý: ${cs.suggestions.join(', ')}\n`;
                }
                reportContent += "\n";
              }
            }

            await aiReport.update({
              overallScore: overallScores.weightedOverallScore || overallScores.overallScore || 0,
              criterionScores: rubricScores,
              reportContent: reportContent,
              reportStatus: "completed",
              generatedAt: new Date()
            });

            responseData.aiReportId = reportId;
            console.log(`✅ Updated AIReport ${reportId} with rubric scores`);
          }
        } catch (aiReportError) {
          console.error(`⚠️ Failed to update AIReport:`, aiReportError.message);
          // Don't fail the request - report is already saved
        }
      }
    } else if (reportFormat === "legacy") {
      // Process legacy format with feedback items
      await reportService.processLegacyReport(
        presentationId,
        report,
        transaction,
      );
      responseData.feedbackCount = report?.feedbackItems?.length || 0;
      responseData.overallScore = report?.summary?.overallScore;
    }

    // Update presentation status is already handled correctly by jobService when jobType is 'report'.
    // We do NOT use reportService.completePresentation here to avoid deadlocks with markJobCompleted.
    
    // Commit transaction to release any table locks before marking job completed
    await transaction.commit();

    // Mark job as completed with metadata
    try {
      if (job) {
        await jobService.markJobCompleted(jobId, {
          reportGenerated: true,
          ...responseData,
        });
      }
    } catch (jobError) {
      console.error(`⚠️ Failed to mark job completed:`, jobError.message);
      // Don't fail request - report already saved
    }

    console.log(`✅ Report webhook processed successfully for job ${jobId}`);

    return res.json({
      success: true,
      message: "Report saved successfully",
      data: responseData,
    });
  } catch (error) {
    if (!transaction.finished) {
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("❌ Transaction rollback failed:", rollbackError);
        }
      }
    }
    console.error("❌ Report webhook error:", error);

    try {
      if (req.body.jobId) {
        await jobService.markJobFailed(
          req.body.jobId,
          `Webhook processing error: ${error.message}`,
          false,
        );
      }
    } catch (jobError) {
      console.error("Failed to mark job as failed:", jobError);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process report webhook",
      error: error.message,
    });
  }
};

/**
 * POST /webhooks/slides-complete
 * Called by Slides worker when OCR + embeddings processing complete
 *
 * Payload:
 * {
 *   jobId: number,
 *   presentationId: number,
 *   slideId: number,
 *   status: 'success' | 'failed',
 *   error?: string,
 *   result?: {
 *     extractedText: string,  // Combined text from all pages
 *     pages?: [{              // For multi-page files (PDF)
 *       pageNumber: number,
 *       text: string
 *     }],
 *     embedding?: number[],
 *     metadata?: object
 *   }
 * }
 */
const slidesComplete = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { jobId, presentationId, slideId, status, error, result } = req.body;

    console.log(
      `📥 Webhook: Slides complete for job ${jobId}, slide ${slideId}, status: ${status}`,
    );

    if (!jobId || !presentationId || !slideId || !status) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: jobId, presentationId, slideId, status",
      });
    }

    const job = await jobService.getJobById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job not found: ${jobId}`,
      });
    }

    // Handle failure
    if (status === "failed") {
      await jobService.markJobFailed(
        jobId,
        error || "Slides processing failed",
        true,
      );
      await transaction.commit();

      return res.json({
        success: true,
        message: "Slides processing failure recorded",
      });
    }

    // Handle success - Update slide with OCR results
    if (result) {
      const slide = await Slide.findByPk(slideId, { transaction });
      if (!slide) {
        throw new Error(`Slide not found: ${slideId}`);
      }

      const updateData = {};

      // Combine text from all pages if pages data exists
      if (
        result.pages &&
        Array.isArray(result.pages) &&
        result.pages.length > 0
      ) {
        // Combine text from all pages
        const combinedText = result.pages
          .map((p) => `[Trang ${p.pageNumber}]\n${p.text}`)
          .join("\n\n");
        updateData.extractedText = combinedText;
        console.log(`✅ Extracted text from ${result.pages.length} pages`);
      } else if (result.extractedText !== undefined) {
        // Fallback to extractedText if pages not available
        updateData.extractedText = result.extractedText;
      }

      await slide.update(updateData, { transaction });

      console.log(`✅ Updated slide ${slideId} with OCR results`);

      // Note: Embedding storage can be added later if needed
      // For now, we'll just log that we received it
      if (result.embedding && result.embedding.length > 0) {
        console.log(
          `📊 Received embedding vector of length ${result.embedding.length} for slide ${slideId}`,
        );
        // TODO: Store embedding in a dedicated table or add metadata field to Slides table
      }
    }

    // Mark job as completed
    await jobService.markJobCompleted(jobId, {
      slideProcessed: true,
      slideId,
      extractedText: result?.extractedText ? result.extractedText.length : 0,
      hasEmbedding: !!(result?.embedding && result.embedding.length > 0),
    });

    await transaction.commit();

    console.log(`✅ Slides webhook processed successfully for job ${jobId}`);

    return res.json({
      success: true,
      message: "Slides processing results saved successfully",
      data: {
        jobId,
        presentationId,
        slideId,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Slides webhook error:", error);

    try {
      if (req.body.jobId) {
        await jobService.markJobFailed(
          req.body.jobId,
          `Webhook processing error: ${error.message}`,
          false,
        );
      }
    } catch (jobError) {
      console.error("Failed to mark job as failed:", jobError);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process slides webhook",
      error: error.message,
    });
  }
};

/**
 * GET /webhooks/health
 * Health check endpoint for workers
 */
const health = async (req, res) => {
  try {
    // Basic health check
    await db.sequelize.authenticate();

    return res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return res.status(503).json({
      success: false,
      status: "unhealthy",
      error: error.message,
    });
  }
};

/**
 * Save speech quality analysis data
 */
async function saveSpeechQualityAnalysis(
  presentationId,
  jobId,
  analysis,
  transaction,
) {
  try {
    const startTime = Date.now();
    console.log(
      `🎤 Starting speech quality analysis save for presentation ${presentationId}`,
    );

    const { overallScores, segmentAnalyses, metadata } = analysis;

    // Create main speech quality analysis record
    const speechAnalysisData = {
      presentationId: presentationId,
      jobId: jobId,
      fluencyScore: overallScores.speechFluency,
      clarityScore: overallScores.speechClarity,
      confidenceScore: overallScores.speechConfidence,
      overallScore: overallScores.speechOverall,
      analyzedAt: new Date(),
      processingTime: metadata?.processingTime,
      opensmileConfig: metadata?.opensmileConfig || "eGeMAPSv02",
      sampleRate: metadata?.sampleRate || 16000,
    };

    // Remove undefined values
    Object.keys(speechAnalysisData).forEach((key) => {
      if (speechAnalysisData[key] === undefined) {
        delete speechAnalysisData[key];
      }
    });

    // === DEBUG LOG ===
    console.log("=== DEBUG SpeechQualityAnalysis data ===");
    console.log("overallScores:", JSON.stringify(overallScores));
    console.log("speechAnalysisData after cleanup:", JSON.stringify(speechAnalysisData));
    // Check if all scores are undefined/null
    const hasAnyScore =
      speechAnalysisData.fluencyScore != null ||
      speechAnalysisData.clarityScore != null ||
      speechAnalysisData.confidenceScore != null ||
      speechAnalysisData.overallScore != null;
    console.log("hasAnyScore:", hasAnyScore);
    console.log("===========================================");

    // If no speech quality scores available, skip this analysis entirely
    if (!hasAnyScore) {
      console.log(
        `⚠️ No speech quality scores available, skipping SpeechQualityAnalysis for presentation ${presentationId}`,
      );
      return null;
    }

    const step1Time = Date.now();
    const [speechAnalysis, created] = await SpeechQualityAnalysis.upsert(
      speechAnalysisData,
      {
        transaction,
        returning: true,
      },
    );

    // MySQL often does not populate instance.id from upsert; reload row so FKs are valid
    let speechAnalysisId = speechAnalysis?.id;
    console.log("speechAnalysis.id from upsert:", speechAnalysis?.id);

    if (speechAnalysisId == null) {
      const row = await SpeechQualityAnalysis.findOne({
        where: { presentationId, jobId },
        order: [["id", "DESC"]],
        transaction,
      });
      speechAnalysisId = row?.id;
      console.log("speechAnalysisId from findOne:", speechAnalysisId);
    }
    if (speechAnalysisId == null) {
      throw new Error(
        "SpeechQualityAnalysis upsert did not yield id; cannot save hesitation patterns",
      );
    }
    console.log(
      `${created ? "Created" : "Updated"} speech quality analysis with ID: ${speechAnalysisId} (${Date.now() - step1Time}ms)`,
    );

    // Prepare batch data for hesitation patterns and segment quality
    const hesitationPatternsData = [];
    const segmentQualityData = [];
    let totalHesitationCount = 0;
    let totalHesitationTime = 0;

    console.log("segmentAnalyses count:", segmentAnalyses?.length ?? 0);

    if (segmentAnalyses && segmentAnalyses.length > 0) {
      console.log(
        `📊 Processing ${segmentAnalyses.length} segments for batch insert`,
      );

      for (const segment of segmentAnalyses) {
        // === DEBUG: log each segment's speech quality ===
        if (segment.speechQuality) {
          console.log(
            `  Segment ${segment.segmentId}: hesitationPatterns=${segment.speechQuality.hesitationPatterns?.length ?? 0}, hesitationCount=${segment.speechQuality.hesitationCount}, totalHesitationTime=${segment.speechQuality.totalHesitationTime}`,
          );
        } else {
          console.log(`  Segment ${segment.segmentId}: NO speechQuality data`);
        }

        // Collect hesitation patterns for batch insert
        if (segment.speechQuality && segment.speechQuality.hesitationPatterns) {
          for (const pattern of segment.speechQuality.hesitationPatterns) {
            const startTime = pattern.startTime ?? pattern.start_time;
            const endTime = pattern.endTime ?? pattern.end_time;
            const duration = pattern.duration;
            const patternType = pattern.type ?? pattern.patternType ?? pattern.pattern_type;
            const confidence = pattern.confidence;
            if (
              startTime == null ||
              endTime == null ||
              duration == null ||
              patternType == null ||
              confidence == null
            ) {
              console.warn(
                "⚠️ Skipping hesitation pattern with missing required fields:",
                JSON.stringify(pattern),
              );
              continue;
            }
            hesitationPatternsData.push({
              speechAnalysisId: speechAnalysisId,
              segmentId: segment.segmentId,
              startTime,
              endTime,
              duration,
              patternType,
              confidence,
              description: pattern.description ?? null,
              segmentText: segment.segmentText || null,
            });

            totalHesitationCount++;
            totalHesitationTime += Number(duration);
          }
        }

        // Prepare segment-level speech quality data for batch processing
        if (segment.speechQuality) {
          const segmentSpeechData = {
            speechAnalysisId: speechAnalysisId,
            segmentId: segment.segmentId,
            segmentHesitationCount: segment.speechQuality.hesitationCount || 0,
            segmentHesitationTime:
              segment.speechQuality.totalHesitationTime || 0,
          };

          // Add speech quality issues and suggestions
          const speechIssues = segment.issues
            ? segment.issues.filter(
                (issue) =>
                  issue.toLowerCase().includes("hesitation") ||
                  issue.toLowerCase().includes("speech") ||
                  issue.toLowerCase().includes("fluency"),
              )
            : [];

          const speechSuggestions = segment.suggestions
            ? segment.suggestions.filter(
                (suggestion) =>
                  suggestion.toLowerCase().includes("hesitation") ||
                  suggestion.toLowerCase().includes("speech") ||
                  suggestion.toLowerCase().includes("fluency"),
              )
            : [];

          if (speechIssues.length > 0) {
            segmentSpeechData.qualityIssues = JSON.stringify(speechIssues);
          }
          if (speechSuggestions.length > 0) {
            segmentSpeechData.qualitySuggestions =
              JSON.stringify(speechSuggestions);
          }

          segmentQualityData.push(segmentSpeechData);
        }
      }

      // === DEBUG before inserts ===
      console.log(`hesitationPatternsData.length: ${hesitationPatternsData.length}`);
      console.log(`segmentQualityData.length: ${segmentQualityData.length}`);
      if (hesitationPatternsData.length > 0) {
        console.log("First hesitation pattern sample:", JSON.stringify(hesitationPatternsData[0]));
      }
      if (segmentQualityData.length > 0) {
        console.log("First segment quality sample:", JSON.stringify(segmentQualityData[0]));
      }

      // Batch insert hesitation patterns
      const step2Time = Date.now();
      if (hesitationPatternsData.length > 0) {
        console.log(
          `📥 Batch inserting ${hesitationPatternsData.length} hesitation patterns`,
        );
        await HesitationPattern.bulkCreate(hesitationPatternsData, {
          transaction,
          ignoreDuplicates: true,
        });
        console.log(
          `✅ Hesitation patterns inserted (${Date.now() - step2Time}ms)`,
        );
      } else {
        console.log("⚠️ No hesitation patterns to insert (hesitationPatternsData is empty)");
      }

      // Batch process segment quality data with timing info
      const step3Time = Date.now();
      if (segmentQualityData.length > 0) {
        console.log(
          `📥 Processing ${segmentQualityData.length} segment quality records`,
        );

        // Get segment timing data in batch
        const segmentIds = segmentQualityData.map((data) => data.segmentId);
        const segmentRecords = await TranscriptSegment.findAll({
          where: { segmentId: segmentIds },
          attributes: ["segmentId", "startTimestamp", "endTimestamp"],
          transaction,
        });

        // Create lookup map for segment timing
        const segmentTimingMap = {};
        segmentRecords.forEach((record) => {
          segmentTimingMap[record.segmentId] = {
            startTimestamp: record.startTimestamp,
            endTimestamp: record.endTimestamp,
          };
        });

        // Update segment quality data with timing info and upsert
        for (const data of segmentQualityData) {
          const timing = segmentTimingMap[data.segmentId];
          if (timing && timing.endTimestamp && timing.startTimestamp) {
            const segmentDuration = timing.endTimestamp - timing.startTimestamp;
            if (segmentDuration > 0) {
              data.hesitationRatio =
                data.segmentHesitationTime / segmentDuration;
              data.segmentStartTime = timing.startTimestamp;
              data.segmentEndTime = timing.endTimestamp;
              data.segmentDuration = segmentDuration;
            }
          }
          await SegmentSpeechQuality.upsert(data, { transaction });
        }
        console.log(
          `✅ Segment quality data processed (${Date.now() - step3Time}ms)`,
        );
      }
    }

    // Update main record with hesitation statistics
    const step4Time = Date.now();
    if (totalHesitationCount > 0) {
      const audioDuration = metadata?.audioDuration;
      const hesitationRate = audioDuration
        ? (totalHesitationCount / audioDuration) * 60
        : null; // per minute

      await speechAnalysis.update(
        {
          totalHesitationCount: totalHesitationCount,
          totalHesitationTime: totalHesitationTime,
          hesitationRate: hesitationRate,
          audioDuration: audioDuration,
        },
        { transaction },
      );
      console.log(
        `✅ Main record updated with statistics (${Date.now() - step4Time}ms)`,
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `✅ Speech quality analysis saved successfully for presentation ${presentationId}`,
    );
    console.log(`   - Total processing time: ${totalTime}ms`);
    console.log(`   - Segments processed: ${segmentAnalyses?.length || 0}`);
    console.log(`   - Hesitation patterns: ${totalHesitationCount}`);
    console.log(
      `   - Total hesitation time: ${totalHesitationTime.toFixed(2)}s`,
    );

    return speechAnalysis;
  } catch (error) {
    console.error("❌ Error saving speech quality analysis:", error);
    console.error("Error details:", error.message);
    throw error;
  }
}

export {
  verifyWebhookAuth,
  asrComplete,
  analysisComplete,
  reportComplete,
  slidesComplete,
  health,
};
