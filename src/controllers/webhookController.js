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

import jobService from '../services/jobService.js';
import speakerService from '../services/speakerService.js';
import db from '../models/index.js';

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
    Slide
} = db;

/**
 * Middleware: Verify webhook authentication
 */
const verifyWebhookAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('⚠️ WEBHOOK_SECRET not configured - webhook authentication disabled');
        return next();
    }

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Missing authorization header'
        });
    }

    const token = authHeader.replace('Bearer ', '');

    if (token !== webhookSecret) {
        console.error('❌ Invalid webhook token');
        return res.status(403).json({
            success: false,
            message: 'Invalid webhook token'
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
        const { jobId, presentationId, status, error, transcript, diarization } = req.body;

        console.log(`📥 Webhook: ASR complete for job ${jobId}, presentation ${presentationId}, status: ${status}`);

        // Validate required fields
        if (!jobId || !presentationId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: jobId, presentationId, status'
            });
        }

        // Get job
        const job = await jobService.getJobById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: `Job not found: ${jobId}`
            });
        }

        // Handle failure
        if (status === 'failed') {
            await jobService.markJobFailed(jobId, error || 'ASR failed', true);

            await Presentation.update(
                { status: 'failed' },
                { where: { presentationId }, transaction }
            );

            await transaction.commit();

            return res.json({
                success: true,
                message: 'ASR failure recorded'
            });
        }

        // Handle success - Save transcript
        if (transcript && transcript.segments) {
            // Get presentation with audioRecord to retrieve audioId
            const presentation = await Presentation.findByPk(presentationId, {
                include: [{ model: db.AudioRecord, as: 'audioRecord' }],
                transaction
            });

            if (!presentation) {
                throw new Error(`Presentation not found: ${presentationId}`);
            }

            if (!presentation.audioRecord) {
                throw new Error(`No audio record found for presentation ${presentationId}`);
            }

            const audioId = presentation.audioRecord.audioId;

            // Create or update transcript record
            let transcriptRecord = await Transcript.findOne({
                where: { presentationId },
                transaction
            });

            if (transcriptRecord) {
                await transcriptRecord.update({
                    audioId,
                    fullTranscript: transcript.fullText,
                    language: transcript.language || 'vi'
                }, { transaction });
            } else {
                transcriptRecord = await Transcript.create({
                    presentationId,
                    audioId,
                    fullTranscript: transcript.fullText,
                    language: transcript.language || 'vi',
                    generatedAt: new Date()
                }, { transaction });
            }

            // Delete old segments if exists
            await TranscriptSegment.destroy({
                where: { transcriptId: transcriptRecord.transcriptId },
                transaction
            });

            // Create transcript segments
            const segments = transcript.segments.map(seg => ({
                transcriptId: transcriptRecord.transcriptId,
                segmentNumber: seg.order,
                startTimestamp: seg.startTimestamp,
                endTimestamp: seg.endTimestamp,
                segmentText: seg.text,
                confidenceScore: seg.confidence || null,
                speakerId: null // Will be linked later in diarization
            }));

            const createdSegments = await TranscriptSegment.bulkCreate(segments, {
                transaction,
                returning: true
            });

            console.log(`✅ Created transcript with ${createdSegments.length} segments`);
            
            // Commit transcript and segments immediately to avoid timeout rollback
            await transaction.commit();
            console.log(`✅ Transcript transaction committed`);
        }

        // Process diarization if available (outside main transaction)
        if (transcript && transcript.segments && diarization && diarization.speakers) {
            try {
                // Create speakers from diarization
                const speakers = await speakerService.createSpeakersFromDiarization(
                    presentationId,
                    diarization.speakers
                );

                console.log(`✅ Created ${speakers.length} speakers from diarization`);

                // Link segments to speakers
                if (diarization.segmentSpeakerMappings) {
                    // Get transcript to get segment IDs
                    const transcriptRecord = await Transcript.findOne({
                        where: { presentationId },
                        include: [{ model: TranscriptSegment, as: 'segments' }]
                    });

                    if (transcriptRecord && transcriptRecord.segments) {
                        // Map segment order to segmentId
                        const segmentIdMap = {};
                        transcriptRecord.segments.forEach(seg => {
                            segmentIdMap[seg.segmentNumber] = seg.segmentId;
                        });

                        // Convert mappings to use segmentId instead of order
                        const mappingsWithIds = diarization.segmentSpeakerMappings.map(m => ({
                            segmentId: segmentIdMap[m.order] || m.segmentId,
                            aiSpeakerLabel: m.aiSpeakerLabel
                        })).filter(m => m.segmentId); // Filter out invalid mappings

                        await speakerService.linkSegmentsToSpeakers(
                            presentationId,
                            mappingsWithIds
                        );

                        console.log(`✅ Linked segments to speakers`);
                    }
                }
            } catch (diarizationError) {
                console.error('⚠️ Diarization processing error (transcript saved):', diarizationError);
                // Don't fail the whole request - transcript is already saved
            }
        }

        // Mark job as completed
        await jobService.markJobCompleted(jobId, {
            transcriptCreated: true,
            segmentCount: transcript?.segments?.length || 0,
            speakerCount: diarization?.speakers?.length || 0
        });

        console.log(`✅ ASR webhook processed successfully for job ${jobId}`);

        // Enqueue analysis job for py-analyst-worker
        try {
            const analysisJob = await jobService.createJob(
                presentationId,
                'analysis',
                {
                    transcriptSegments: transcript?.segments?.length || 0,
                    uniqueSpeakers: diarization?.speakers?.length || 0,
                    asrJobId: jobId
                }
            );
            console.log(`✅ Analysis job ${analysisJob.jobId} enqueued for presentation ${presentationId}`);
        } catch (enqueueError) {
            console.error('⚠️ Failed to enqueue analysis job:', enqueueError);
            // Don't fail the request - ASR completed successfully
        }

        return res.json({
            success: true,
            message: 'ASR results saved successfully',
            data: {
                jobId,
                presentationId,
                transcriptSegments: transcript?.segments?.length || 0,
                speakers: diarization?.speakers?.length || 0
            }
        });

    } catch (error) {
        // Only rollback if transaction is still pending (not committed yet)
        if (!transaction.finished) {
            await transaction.rollback();
        }
        console.error('❌ ASR webhook error:', error);

        // Try to mark job as failed
        try {
            if (req.body.jobId) {
                await jobService.markJobFailed(req.body.jobId, `Webhook processing error: ${error.message}`, false);
            }
        } catch (jobError) {
            console.error('Failed to mark job as failed:', jobError);
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process ASR webhook',
            error: error.message
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
const analysisComplete = async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { jobId, presentationId, status, error, analysis } = req.body;

        console.log(`📥 Webhook: Analysis complete for job ${jobId}, presentation ${presentationId}, status: ${status}`);

        if (!jobId || !presentationId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const job = await jobService.getJobById(parseInt(jobId));
        if (!job) {
            return res.status(404).json({
                success: false,
                message: `Job not found: ${jobId}`
            });
        }

        // Handle failure
        if (status === 'failed') {
            await jobService.markJobFailed(jobId, error || 'Analysis failed', true);
            await transaction.commit();

            return res.json({
                success: true,
                message: 'Analysis failure recorded'
            });
        }

        // Handle success - Save analysis results
        if (analysis) {
            console.log(`📊 Saving analysis results for presentation ${presentationId}`);
            
            // Save segment-level analyses with proper slideId mapping
            if (analysis.segmentAnalyses && analysis.segmentAnalyses.length > 0) {
                for (const segAnalysis of analysis.segmentAnalyses) {
                    // Find the actual slideId from slide number
                    let slideId = null;
                    if (segAnalysis.bestMatchingSlide) {
                        const slide = await Slide.findOne({
                            where: { 
                                presentationId: presentationId,
                                slideNumber: segAnalysis.bestMatchingSlide 
                            }
                        });
                        slideId = slide ? slide.slideId : null;
                    }
                    
                    // Create SegmentAnalysis with all the data from semantic worker
                    await SegmentAnalysis.create({
                        segmentId: segAnalysis.segmentId,
                        slideId: slideId, // Can be null if no matching slide found
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
                        analyzedAt: new Date()
                    }, { transaction });
                }
                
                console.log(`✅ Saved ${analysis.segmentAnalyses.length} segment analyses`);
            }
            
            // Save overall analysis result (upsert since presentationId might have unique constraint)
            const [analysisResult, created] = await AnalysisResult.upsert({
                presentationId,
                configId: null,
                overallScore: analysis.overallScores?.overallScore || 0,
                analyzedAt: new Date(),
                status: 'done'
            }, { transaction });

            console.log(`✅ ${created ? 'Created' : 'Updated'} overall analysis result`);
        }

        // Mark job as completed
        await jobService.markJobCompleted(jobId, {
            analysisCreated: true,
            segmentAnalysisCount: analysis?.segmentAnalyses?.length || 0
        });

        await transaction.commit();

        console.log(`✅ Analysis webhook processed successfully for job ${jobId}`);

        return res.json({
            success: true,
            message: 'Analysis results saved successfully',
            data: {
                jobId,
                presentationId,
                segmentAnalyses: analysis?.segmentAnalyses?.length || 0
            }
        });

    } catch (error) {
        // Only rollback if transaction hasn't been committed yet
        if (!transaction.finished) {
            await transaction.rollback();
        }
        console.error('❌ Analysis webhook error:', error);

        try {
            if (req.body.jobId) {
                await jobService.markJobFailed(req.body.jobId, `Webhook processing error: ${error.message}`, false);
            }
        } catch (jobError) {
            console.error('Failed to mark job as failed:', jobError);
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process analysis webhook',
            error: error.message
        });
    }
};

/**
 * POST /webhooks/report-complete
 * Called by Report worker when feedback report generation complete
 * 
 * Payload:
 * {
 *   jobId: number,
 *   presentationId: number,
 *   status: 'success' | 'failed',
 *   error?: string,
 *   report?: {
 *     feedbackItems: [{
 *       level: 'presentation' | 'segment',
 *       targetId: number,
 *       category: string,
 *       severity: 'info' | 'warning' | 'critical',
 *       message: string,
 *       suggestions?: string,
 *       evidence?: {timestamp, text, slideNumber}
 *     }],
 *     summary: {
 *       overallScore: number,
 *       strengths: string[],
 *       weaknesses: string[],
 *       recommendations: string[]
 *     }
 *   }
 * }
 */
const reportComplete = async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { jobId, presentationId, status, error, report } = req.body;

        console.log(`📥 Webhook: Report complete for job ${jobId}, presentation ${presentationId}, status: ${status}`);

        if (!jobId || !presentationId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const job = await jobService.getJobById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: `Job not found: ${jobId}`
            });
        }

        // Handle failure
        if (status === 'failed') {
            await jobService.markJobFailed(jobId, error || 'Report generation failed', true);
            await transaction.commit();

            return res.json({
                success: true,
                message: 'Report failure recorded'
            });
        }

        // Handle success - Save feedback
        if (report && report.feedbackItems) {
            const feedbackRecords = report.feedbackItems.map(item => ({
                presentationId,
                segmentId: item.level === 'segment' ? item.targetId : null,
                feedbackLevel: item.level,
                category: item.category,
                severity: item.severity,
                message: item.message,
                suggestions: item.suggestions || null,
                evidenceData: item.evidence ? JSON.stringify(item.evidence) : null,
                generatedAt: new Date()
            }));

            await Feedback.bulkCreate(feedbackRecords, { transaction });

            console.log(`✅ Created ${feedbackRecords.length} feedback items`);
        }

        // Save summary as analysis result
        if (report && report.summary) {
            await AnalysisResult.create({
                presentationId,
                analysisType: 'summary',
                overallScore: report.summary.overallScore || 0,
                detailedScores: JSON.stringify({
                    strengths: report.summary.strengths || [],
                    weaknesses: report.summary.weaknesses || []
                }),
                insights: JSON.stringify({
                    recommendations: report.summary.recommendations || []
                }),
                analyzedAt: new Date()
            }, { transaction });

            console.log(`✅ Saved report summary`);
        }

        // Mark job as completed
        await jobService.markJobCompleted(jobId, {
            reportGenerated: true,
            feedbackCount: report?.feedbackItems?.length || 0
        });

        // Update presentation status to completed
        await Presentation.update(
            {
                status: 'completed',
                completedAt: new Date()
            },
            {
                where: { presentationId },
                transaction
            }
        );

        await transaction.commit();

        console.log(`✅ Report webhook processed successfully for job ${jobId}`);

        return res.json({
            success: true,
            message: 'Report saved successfully',
            data: {
                jobId,
                presentationId,
                feedbackItems: report?.feedbackItems?.length || 0
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Report webhook error:', error);

        try {
            if (req.body.jobId) {
                await jobService.markJobFailed(req.body.jobId, `Webhook processing error: ${error.message}`, false);
            }
        } catch (jobError) {
            console.error('Failed to mark job as failed:', jobError);
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process report webhook',
            error: error.message
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

        console.log(`📥 Webhook: Slides complete for job ${jobId}, slide ${slideId}, status: ${status}`);

        if (!jobId || !presentationId || !slideId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: jobId, presentationId, slideId, status'
            });
        }

        const job = await jobService.getJobById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: `Job not found: ${jobId}`
            });
        }

        // Handle failure
        if (status === 'failed') {
            await jobService.markJobFailed(jobId, error || 'Slides processing failed', true);
            await transaction.commit();

            return res.json({
                success: true,
                message: 'Slides processing failure recorded'
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
            if (result.pages && Array.isArray(result.pages) && result.pages.length > 0) {
                // Combine text from all pages
                const combinedText = result.pages.map(p => 
                    `[Trang ${p.pageNumber}]\n${p.text}`
                ).join('\n\n');
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
                console.log(`📊 Received embedding vector of length ${result.embedding.length} for slide ${slideId}`);
                // TODO: Store embedding in a dedicated table or add metadata field to Slides table
            }
        }

        // Mark job as completed
        await jobService.markJobCompleted(jobId, {
            slideProcessed: true,
            slideId,
            extractedText: result?.extractedText ? result.extractedText.length : 0,
            hasEmbedding: !!(result?.embedding && result.embedding.length > 0)
        });

        await transaction.commit();

        console.log(`✅ Slides webhook processed successfully for job ${jobId}`);

        return res.json({
            success: true,
            message: 'Slides processing results saved successfully',
            data: {
                jobId,
                presentationId,
                slideId
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Slides webhook error:', error);

        try {
            if (req.body.jobId) {
                await jobService.markJobFailed(req.body.jobId, `Webhook processing error: ${error.message}`, false);
            }
        } catch (jobError) {
            console.error('Failed to mark job as failed:', jobError);
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process slides webhook',
            error: error.message
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
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        return res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
};

export {
    verifyWebhookAuth,
    asrComplete,
    analysisComplete,
    reportComplete,
    slidesComplete,
    health
};
