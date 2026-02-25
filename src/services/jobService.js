/**
 * Job Service - Quản lý lifecycle của jobs trong pipeline xử lý
 * 
 * Chức năng:
 * - Tạo và theo dõi jobs (ASR → Analysis → Report)
 * - Cập nhật trạng thái job (queued → running → completed/failed)
 * - Xử lý retry logic cho failed jobs
 * - Query jobs theo presentation, type, status
 * - Cleanup old jobs
 */

import db from '../models/index.js';
import queueService from './queueService.js';
import Sequelize from 'sequelize';

const { Op } = Sequelize;

const { Job, Presentation } = db;

const MAX_RETRY_COUNT = 3;
const JOB_TYPES = {
    ASR: 'asr',
    ANALYSIS: 'analysis',
    REPORT: 'report',
    SLIDES: 'slides'
};

const JOB_STATUS = {
    QUEUED: 'queued',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

class JobService {
    /**
     * Tạo job mới và đẩy vào SQS queue
     * @param {number} presentationId 
     * @param {string} jobType - 'asr', 'analysis', 'report'
     * @param {object} metadata - Custom data for job
     * @param {string} sqsMessageId - Optional SQS message ID nếu đã send trước
     * @returns {Promise<Job>}
     */
    async createJob(presentationId, jobType, metadata = {}, sqsMessageId = null) {
        try {
            // Validate job type
            if (!Object.values(JOB_TYPES).includes(jobType)) {
                throw new Error(`Invalid job type: ${jobType}. Must be one of: ${Object.values(JOB_TYPES).join(', ')}`);
            }

            // Check if presentation exists
            const presentation = await Presentation.findByPk(presentationId);
            if (!presentation) {
                throw new Error(`Presentation not found: ${presentationId}`);
            }

            // Check for existing pending/running job
            // For slides: check by slideId in metadata (each slide needs its own job)
            // For other types: check by presentationId + jobType (one job per presentation)
            let existingJob = null;

            if (jobType === JOB_TYPES.SLIDES && metadata?.slideId) {
                // For slides, check if there's already a job for this specific slide
                const jobs = await Job.findAll({
                    where: {
                        presentationId,
                        jobType,
                        status: {
                            [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING]
                        }
                    }
                });

                // Filter by slideId in metadata
                existingJob = jobs.find(job => {
                    const jobMetadata = job.metadata || {};
                    return jobMetadata.slideId === metadata.slideId;
                });
            } else {
                // For other job types, check by presentationId + jobType
                existingJob = await Job.findOne({
                    where: {
                        presentationId,
                        jobType,
                        status: {
                            [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING]
                        }
                    }
                });
            }

            if (existingJob) {
                if (jobType === JOB_TYPES.SLIDES) {
                    console.log(`⚠️ Job already exists for slide ${metadata?.slideId}, presentation ${presentationId}`);
                } else {
                    console.log(`⚠️ Job already exists for presentation ${presentationId}, type ${jobType}`);
                }
                return existingJob;
            }

            // Create job record
            const job = await Job.create({
                presentationId,
                jobType,
                status: JOB_STATUS.QUEUED,
                sqsMessageId,
                metadata,
                retryCount: 0
            });

            console.log(`✅ Created job ${job.jobId} for presentation ${presentationId}, type: ${jobType}`);

            // Send to appropriate queue if sqsMessageId not provided
            if (!sqsMessageId) {
                await this._sendJobToQueue(job);
            }

            return job;
        } catch (error) {
            console.error('❌ Error creating job:', error);
            throw error;
        }
    }

    /**
     * Đẩy job vào SQS queue tương ứng
     * @private
     */
    async _sendJobToQueue(job) {
        try {
            const presentation = await Presentation.findByPk(job.presentationId, {
                include: ['audioRecord']
            });

            let queueResponse;
            switch (job.jobType) {
                case JOB_TYPES.ASR:
                    queueResponse = await queueService.sendToASRQueue({
                        jobId: job.jobId,
                        presentationId: job.presentationId,
                        audioUrl: presentation.audioRecord?.filePath || '',
                        metadata: job.metadata
                    });
                    break;

                case JOB_TYPES.ANALYSIS:
                    queueResponse = await queueService.sendToAnalysisQueue({
                        jobId: job.jobId,
                        presentationId: job.presentationId,
                        metadata: job.metadata
                    });
                    break;

                case JOB_TYPES.REPORT:
                    queueResponse = await queueService.sendToReportQueue({
                        jobId: job.jobId,
                        presentationId: job.presentationId,
                        metadata: job.metadata
                    });
                    break;

                case JOB_TYPES.SLIDES:
                    queueResponse = await queueService.sendToSlidesQueue({
                        jobId: job.jobId,
                        presentationId: job.presentationId,
                        slideId: job.metadata?.slideId,
                        slideUrl: job.metadata?.slideUrl,
                        slideNumber: job.metadata?.slideNumber,
                        metadata: job.metadata
                    });
                    break;

                default:
                    throw new Error(`Unknown job type: ${job.jobType}`);
            }

            // Extract messageId from response object
            const messageId = queueResponse?.messageId || queueResponse?.MessageId || null;

            // Update job with SQS message ID
            if (messageId) {
                await job.update({ sqsMessageId: messageId });
                console.log(`📤 Sent job ${job.jobId} to ${job.jobType} queue, messageId: ${messageId}`);
            } else {
                console.warn(`⚠️ No messageId returned from queue service for job ${job.jobId}`);
            }

        } catch (error) {
            console.error(`❌ Error sending job ${job.jobId} to queue:`, error);
            // Mark job as failed if can't send to queue
            await job.markAsFailed(error.message);
            throw error;
        }
    }

    /**
     * Cập nhật trạng thái job
     * @param {number} jobId 
     * @param {string} status 
     * @param {object} updates - Additional fields to update
     * @returns {Promise<Job>}
     */
    async updateJobStatus(jobId, status, updates = {}) {
        try {
            const job = await Job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job not found: ${jobId}`);
            }

            await job.update({
                status,
                ...updates
            });

            console.log(`🔄 Updated job ${jobId} status: ${status}`);
            return job;
        } catch (error) {
            console.error('❌ Error updating job status:', error);
            throw error;
        }
    }

    /**
     * Đánh dấu job bắt đầu chạy
     * @param {number} jobId 
     * @param {string} workerName - Tên worker đang xử lý
     * @returns {Promise<Job>}
     */
    async markJobStarted(jobId, workerName) {
        try {
            const job = await Job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job not found: ${jobId}`);
            }

            await job.markAsRunning(workerName);
            console.log(`🚀 Job ${jobId} started by worker: ${workerName}`);
            return job;
        } catch (error) {
            console.error('❌ Error marking job as started:', error);
            throw error;
        }
    }

    /**
     * Đánh dấu job hoàn thành
     * @param {number} jobId 
     * @param {object} result - Kết quả xử lý
     * @returns {Promise<Job>}
     */
    async markJobCompleted(jobId, result = {}) {
        try {
            const job = await Job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job not found: ${jobId}`);
            }

            await job.markAsCompleted(result);
            console.log(`✅ Job ${jobId} completed successfully`);

            // Trigger next job in pipeline nếu cần
            await this._triggerNextJobInPipeline(job);

            return job;
        } catch (error) {
            console.error('❌ Error marking job as completed:', error);
            throw error;
        }
    }

    /**
     * Kích hoạt job tiếp theo trong pipeline
     * Pipeline: ASR + SLIDES → ANALYSIS → REPORT
     * @private
     */
    async _triggerNextJobInPipeline(completedJob) {
        try {
            const { presentationId, jobType } = completedJob;

            if (jobType === JOB_TYPES.ASR || jobType === JOB_TYPES.SLIDES) {
                // Check if both ASR and all SLIDES jobs are completed
                const canTriggerAnalysis = await this._canTriggerAnalysisJob(presentationId);
                
                if (canTriggerAnalysis) {
                    console.log(`⏭️ Both ASR and SLIDES completed, triggering ANALYSIS for presentation ${presentationId}`);
                    await this.createJob(presentationId, JOB_TYPES.ANALYSIS, {
                        triggeredBy: completedJob.jobId,
                        previousJobType: jobType,
                        triggerReason: 'asr_and_slides_completed'
                    });
                } else {
                    console.log(`⏳ Waiting for other jobs to complete before triggering ANALYSIS for presentation ${presentationId}`);
                }
            } else if (jobType === JOB_TYPES.ANALYSIS) {
                console.log(`⏭️ Triggering REPORT for presentation ${presentationId}`);
                await this.createJob(presentationId, JOB_TYPES.REPORT, {
                    triggeredBy: completedJob.jobId,
                    previousJobType: jobType
                });
            }
            // Report is final step, no next job
        } catch (error) {
            console.error('❌ Error triggering next job in pipeline:', error);
            // Don't throw, just log - pipeline continuation failure shouldn't fail current job
        }
    }

    /**
     * Kiểm tra xem có thể trigger ANALYSIS job không
     * Điều kiện: ASR completed + tất cả SLIDES jobs completed
     * @private
     */
    async _canTriggerAnalysisJob(presentationId) {
        try {
            // Check if ASR job is completed
            const asrJob = await Job.findOne({
                where: {
                    presentationId,
                    jobType: JOB_TYPES.ASR,
                    status: JOB_STATUS.COMPLETED
                }
            });

            if (!asrJob) {
                console.log(`❌ ASR job not completed for presentation ${presentationId}`);
                return false;
            }

            // Check if there are any pending/running SLIDES jobs
            const pendingSlidesJobs = await Job.findAll({
                where: {
                    presentationId,
                    jobType: JOB_TYPES.SLIDES,
                    status: {
                        [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING]
                    }
                }
            });

            if (pendingSlidesJobs.length > 0) {
                console.log(`⏳ ${pendingSlidesJobs.length} SLIDES jobs still pending/running for presentation ${presentationId}`);
                return false;
            }

            // Check if there are any completed SLIDES jobs
            const completedSlidesJobs = await Job.findAll({
                where: {
                    presentationId,
                    jobType: JOB_TYPES.SLIDES,
                    status: JOB_STATUS.COMPLETED
                }
            });

            // Get total number of slides for this presentation
            const presentation = await Presentation.findByPk(presentationId, {
                include: [{
                    model: db.Slide,
                    as: 'slides'
                }]
            });

            const totalSlides = presentation?.slides?.length || 0;
            const completedSlides = completedSlidesJobs.length;

            console.log(`📊 Slides progress for presentation ${presentationId}: ${completedSlides}/${totalSlides} completed`);

            if (totalSlides === 0) {
                console.log(`⚠️ No slides found for presentation ${presentationId}, proceeding with analysis`);
                return true;
            }

            if (completedSlides < totalSlides) {
                console.log(`⏳ Not all slides completed yet (${completedSlides}/${totalSlides}) for presentation ${presentationId}`);
                return false;
            }

            // Check if ANALYSIS job already exists
            const existingAnalysisJob = await Job.findOne({
                where: {
                    presentationId,
                    jobType: JOB_TYPES.ANALYSIS,
                    status: {
                        [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING, JOB_STATUS.COMPLETED]
                    }
                }
            });

            if (existingAnalysisJob) {
                console.log(`⚠️ ANALYSIS job already exists for presentation ${presentationId} (status: ${existingAnalysisJob.status})`);
                return false;
            }

            console.log(`✅ All conditions met for ANALYSIS job: ASR completed + all ${totalSlides} slides completed`);
            return true;

        } catch (error) {
            console.error('❌ Error checking if can trigger analysis job:', error);
            return false;
        }
    }

    /**
     * Đánh dấu job thất bại và xử lý retry
     * @param {number} jobId 
     * @param {string} errorMessage 
     * @param {boolean} shouldRetry - Có retry không
     * @returns {Promise<Job>}
     */
    async markJobFailed(jobId, errorMessage, shouldRetry = true) {
        try {
            const job = await Job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job not found: ${jobId}`);
            }

            await job.markAsFailed(errorMessage);
            console.log(`❌ Job ${jobId} failed: ${errorMessage}`);

            // Retry logic
            if (shouldRetry && job.retryCount < MAX_RETRY_COUNT) {
                console.log(`🔄 Retrying job ${jobId} (attempt ${job.retryCount + 1}/${MAX_RETRY_COUNT})`);
                await this.retryFailedJob(jobId);
            } else if (job.retryCount >= MAX_RETRY_COUNT) {
                console.log(`⛔ Job ${jobId} reached max retry count (${MAX_RETRY_COUNT}), not retrying`);
            }

            return job;
        } catch (error) {
            console.error('❌ Error marking job as failed:', error);
            throw error;
        }
    }

    /**
     * Mark orphaned jobs as failed (jobs với status queued/running nhưng SQS message đã bị xóa)
     * @param {number} presentationId 
     * @returns {Promise<number>} - Số jobs đã cleanup
     */
    async cleanupOrphanedJobs(presentationId) {
        try {
            const orphanedJobs = await Job.findAll({
                where: {
                    presentationId,
                    status: {
                        [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING]
                    }
                }
            });

            let cleanedCount = 0;
            for (const job of orphanedJobs) {
                await job.markAsFailed('Job cleanup: SQS message no longer exists or job was orphaned');
                cleanedCount++;
                console.log(`🧹 Cleaned up orphaned job ${job.jobId} for presentation ${presentationId}`);
            }

            return cleanedCount;
        } catch (error) {
            console.error('❌ Error cleaning up orphaned jobs:', error);
            throw error;
        }
    }

    /**
     * Retry failed job
     * @param {number} jobId 
     * @returns {Promise<Job>}
     */
    async retryFailedJob(jobId) {
        try {
            const job = await Job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job not found: ${jobId}`);
            }

            if (job.status !== JOB_STATUS.FAILED) {
                throw new Error(`Job ${jobId} is not in failed state, cannot retry`);
            }

            if (job.retryCount >= MAX_RETRY_COUNT) {
                throw new Error(`Job ${jobId} has reached max retry count (${MAX_RETRY_COUNT})`);
            }

            // Update job for retry
            await job.update({
                status: JOB_STATUS.QUEUED,
                retryCount: job.retryCount + 1,
                errorMessage: null,
                workerName: null,
                startedAt: null
            });

            // Resend to queue
            await this._sendJobToQueue(job);

            console.log(`🔄 Retried job ${jobId}, attempt ${job.retryCount}/${MAX_RETRY_COUNT}`);
            return job;
        } catch (error) {
            console.error('❌ Error retrying job:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra xem có job đang active (queued/running) cho presentation không
     * @param {number} presentationId 
     * @returns {Promise<Job|null>}
     */
    async getActiveJobForPresentation(presentationId) {
        try {
            const activeJob = await Job.findOne({
                where: {
                    presentationId,
                    status: {
                        [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING]
                    }
                },
                order: [['createdAt', 'DESC']]
            });

            return activeJob;
        } catch (error) {
            console.error('❌ Error getting active job:', error);
            throw error;
        }
    }

    /**
     * Lấy job theo presentation và type
     * @param {number} presentationId 
     * @param {string} jobType - Optional, lấy tất cả nếu không có
     * @returns {Promise<Job|Job[]>}
     */
    async getJobByPresentation(presentationId, jobType = null) {
        try {
            const where = { presentationId };
            if (jobType) {
                where.jobType = jobType;
            }

            const jobs = await Job.findAll({
                where,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: Presentation,
                    as: 'presentation',
                    attributes: ['presentationId', 'title', 'status']
                }]
            });

            if (jobType) {
                return jobs[0] || null;
            }
            return jobs;
        } catch (error) {
            console.error('❌ Error getting job by presentation:', error);
            throw error;
        }
    }

    /**
     * Lấy lịch sử tất cả jobs của presentation
     * @param {number} presentationId 
     * @returns {Promise<Job[]>}
     */
    async getJobHistory(presentationId) {
        try {
            return await Job.findAll({
                where: { presentationId },
                order: [['createdAt', 'ASC']],
                attributes: [
                    'jobId', 'jobType', 'status', 'retryCount',
                    'workerName', 'errorMessage',
                    'createdAt', 'startedAt', 'completedAt'
                ]
            });
        } catch (error) {
            console.error('❌ Error getting job history:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách jobs đang chờ xử lý
     * @param {string} jobType - Optional
     * @param {number} limit - Số lượng jobs
     * @returns {Promise<Job[]>}
     */
    async getPendingJobs(jobType = null, limit = 50) {
        try {
            const where = { status: JOB_STATUS.QUEUED };
            if (jobType) {
                where.jobType = jobType;
            }

            return await Job.findAll({
                where,
                order: [['createdAt', 'ASC']],
                limit,
                include: [{
                    model: Presentation,
                    as: 'presentation',
                    attributes: ['presentationId', 'title']
                }]
            });
        } catch (error) {
            console.error('❌ Error getting pending jobs:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách jobs đang chạy
     * @param {string} jobType - Optional
     * @returns {Promise<Job[]>}
     */
    async getRunningJobs(jobType = null) {
        try {
            const where = { status: JOB_STATUS.RUNNING };
            if (jobType) {
                where.jobType = jobType;
            }

            return await Job.findAll({
                where,
                order: [['startedAt', 'DESC']],
                include: [{
                    model: Presentation,
                    as: 'presentation',
                    attributes: ['presentationId', 'title']
                }]
            });
        } catch (error) {
            console.error('❌ Error getting running jobs:', error);
            throw error;
        }
    }

    /**
     * Lấy thống kê jobs
     * @param {number} presentationId - Optional
     * @returns {Promise<object>}
     */
    async getJobStatistics(presentationId = null) {
        try {
            const where = presentationId ? { presentationId } : {};

            const [total, queued, running, completed, failed] = await Promise.all([
                Job.count({ where }),
                Job.count({ where: { ...where, status: JOB_STATUS.QUEUED } }),
                Job.count({ where: { ...where, status: JOB_STATUS.RUNNING } }),
                Job.count({ where: { ...where, status: JOB_STATUS.COMPLETED } }),
                Job.count({ where: { ...where, status: JOB_STATUS.FAILED } })
            ]);

            return {
                total,
                queued,
                running,
                completed,
                failed,
                successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('❌ Error getting job statistics:', error);
            throw error;
        }
    }

    /**
     * Cleanup old completed jobs
     * @param {number} daysOld - Xóa jobs cũ hơn X ngày
     * @returns {Promise<number>} - Số jobs đã xóa
     */
    async cleanupOldJobs(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const deletedCount = await Job.destroy({
                where: {
                    status: {
                        [Op.in]: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED]
                    },
                    completedAt: {
                        [Op.lt]: cutoffDate
                    }
                }
            });

            console.log(`🧹 Cleaned up ${deletedCount} old jobs (older than ${daysOld} days)`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Error cleaning up old jobs:', error);
            throw error;
        }
    }

    /**
     * Reset stuck jobs (running quá lâu)
     * @param {number} hoursStuck - Jobs running lâu hơn X giờ
     * @returns {Promise<number>}
     */
    async resetStuckJobs(hoursStuck = 2) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hoursStuck);

            const stuckJobs = await Job.findAll({
                where: {
                    status: JOB_STATUS.RUNNING,
                    startedAt: {
                        [Op.lt]: cutoffDate
                    }
                }
            });

            let resetCount = 0;
            for (const job of stuckJobs) {
                await job.update({
                    status: JOB_STATUS.QUEUED,
                    workerName: null,
                    startedAt: null,
                    errorMessage: `Auto-reset: stuck for more than ${hoursStuck} hours`
                });

                // Resend to queue
                await this._sendJobToQueue(job);
                resetCount++;
            }

            console.log(`🔄 Reset ${resetCount} stuck jobs (running > ${hoursStuck} hours)`);
            return resetCount;
        } catch (error) {
            console.error('❌ Error resetting stuck jobs:', error);
            throw error;
        }
    }

    /**
     * Get job by ID
     * @param {number} jobId 
     * @returns {Promise<Job>}
     */
    async getJobById(jobId) {
        try {
            const job = await Job.findByPk(jobId, {
                include: [{
                    model: Presentation,
                    as: 'presentation',
                    attributes: ['presentationId', 'title', 'status']
                }]
            });

            if (!job) {
                throw new Error(`Job not found: ${jobId}`);
            }

            return job;
        } catch (error) {
            console.error('❌ Error getting job by ID:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new JobService();
