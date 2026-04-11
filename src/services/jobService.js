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

import db from "../models/index.js";
import queueService from "./queueService.js";
import Sequelize from "sequelize";

const { Op } = Sequelize;

const { Job, Presentation } = db;

const MAX_RETRY_COUNT = 3;
const JOB_TYPES = {
  ASR: "asr",
  SEMANTIC: "semantic",
  REPORT: "report",
  SLIDES: "slides",
};

const JOB_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
};

class JobService {
  /**
   * Tạo job mới và đẩy vào SQS queue
   * @param {number} presentationId
   * @param {string} jobType - 'asr', 'semantic', 'report'
   * @param {object} metadata - Custom data for job
   * @param {string} sqsMessageId - Optional SQS message ID nếu đã send trước
   * @returns {Promise<Job>}
   */
  async createJob(presentationId, jobType, metadata = {}, sqsMessageId = null) {
    try {
      // Validate job type
      if (!Object.values(JOB_TYPES).includes(jobType)) {
        throw new Error(
          `Invalid job type: ${jobType}. Must be one of: ${Object.values(JOB_TYPES).join(", ")}`,
        );
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
              [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING],
            },
          },
        });

        // Filter by slideId in metadata
        existingJob = jobs.find((job) => {
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
              [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING],
            },
          },
        });
      }

      if (existingJob) {
        if (jobType === JOB_TYPES.SLIDES) {
          console.log(
            `⚠️ Job already exists for slide ${metadata?.slideId}, presentation ${presentationId}`,
          );
        } else {
          console.log(
            `⚠️ Job already exists for presentation ${presentationId}, type ${jobType}`,
          );
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
        retryCount: 0,
      });

      console.log(
        `✅ Created job ${job.jobId} for presentation ${presentationId}, type: ${jobType}`,
      );

      // Send to appropriate queue if sqsMessageId not provided
      if (!sqsMessageId) {
        await this._sendJobToQueue(job);
      }

      return job;
    } catch (error) {
      console.error("❌ Error creating job:", error);
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
        include: ["audioRecord"],
      });

      let queueResponse;
      switch (job.jobType) {
        case JOB_TYPES.ASR:
          queueResponse = await queueService.sendToASRQueue({
            jobId: job.jobId,
            presentationId: job.presentationId,
            audioUrl: presentation.audioRecord?.filePath || "",
            metadata: job.metadata,
          });
          break;

        case JOB_TYPES.SEMANTIC:
          queueResponse = await queueService.sendToSemanticQueue({
            jobId: job.jobId,
            presentationId: job.presentationId,
            metadata: job.metadata,
          });
          break;

        case JOB_TYPES.REPORT:
          queueResponse = await queueService.sendToReportQueue({
            jobId: job.jobId,
            presentationId: job.presentationId,
            metadata: job.metadata,
          });
          break;

        case JOB_TYPES.SLIDES:
          queueResponse = await queueService.sendToSlidesQueue({
            jobId: job.jobId,
            presentationId: job.presentationId,
            slideId: job.metadata?.slideId,
            slideUrl: job.metadata?.slideUrl,
            slideNumber: job.metadata?.slideNumber,
            metadata: job.metadata,
          });
          break;

        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Extract messageId from response object
      const messageId =
        queueResponse?.messageId || queueResponse?.MessageId || null;

      // Update job with SQS message ID
      if (messageId) {
        await job.update({ sqsMessageId: messageId });
        console.log(
          `📤 Sent job ${job.jobId} to ${job.jobType} queue, messageId: ${messageId}`,
        );
      } else {
        console.warn(
          `⚠️ No messageId returned from queue service for job ${job.jobId}`,
        );
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
        ...updates,
      });

      console.log(`🔄 Updated job ${jobId} status: ${status}`);
      return job;
    } catch (error) {
      console.error("❌ Error updating job status:", error);
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

      // When the ASR job (first in pipeline) starts, mark presentation as 'processing'
      if (job.jobType === JOB_TYPES.ASR) {
        await Presentation.update(
          { status: "processing" },
          { where: { presentationId: job.presentationId } }
        );
        console.log(`📊 Presentation ${job.presentationId} status → processing`);
      }

      return job;
    } catch (error) {
      console.error("❌ Error marking job as started:", error);
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
      console.error("❌ Error marking job as completed:", error);
      throw error;
    }
  }

  /**
   * Kích hoạt job tiếp theo trong pipeline
   * Pipeline: ASR → Analysis → Report
   * @private
   */
  async _triggerNextJobInPipeline(completedJob) {
    try {
      const { presentationId, jobType } = completedJob;

      if (jobType === JOB_TYPES.ASR) {
if (jobType === JOB_TYPES.ASR) {

  nextJobType = JOB_TYPES.SEMANTIC;
}

// Report is triggered manually by aiReportService to ensure rubric metadata is included

if (nextJobType) {
        console.log(
          `⏭️ Triggering next job in pipeline: ${JOB_TYPES.SEMANTIC} for presentation ${presentationId}`,
        );
        await this.createJob(presentationId, JOB_TYPES.SEMANTIC, {
          triggeredBy: completedJob.jobId,
          previousJobType: jobType,
        });
      } else if (jobType === JOB_TYPES.SEMANTIC) {
        // SEMANTIC completed – aiReportService will dispatch the report queue message.
        // Nothing to do here in the job pipeline.
        console.log(
          `✅ Semantic job ${completedJob.jobId} done for presentation ${presentationId}. Report dispatch handled by aiReportService.`,
        );
      } else if (jobType === JOB_TYPES.REPORT) {
        // Report is the last step – mark presentation as 'done'
        await this._updatePresentationStatusWithRetry(presentationId, "done");
        console.log(`🎉 Presentation ${presentationId} status → done (pipeline complete)`);
      }
    } catch (error) {
      console.error("❌ Error triggering next job in pipeline:", error);
      // Don't throw, just log - pipeline continuation failure shouldn't fail current job
    }
  }

  /**
   * Update Presentation status with retry logic for lock wait timeouts
   * @private
   */
  async _updatePresentationStatusWithRetry(presentationId, status, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await Presentation.update(
          { status },
          { where: { presentationId } }
        );
        return; // success
      } catch (error) {
        const isLockTimeout = error?.original?.code === 'ER_LOCK_WAIT_TIMEOUT' 
          || error?.parent?.code === 'ER_LOCK_WAIT_TIMEOUT';
        if (isLockTimeout && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.warn(
            `⚠️ Lock timeout updating presentation ${presentationId} status to '${status}', retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
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
        console.log(
          `🔄 Retrying job ${jobId} (attempt ${job.retryCount + 1}/${MAX_RETRY_COUNT})`,
        );
        await this.retryFailedJob(jobId);
      } else {
        // No more retries – mark presentation as 'failed'
        const reason = job.retryCount >= MAX_RETRY_COUNT
          ? `Job ${jobId} reached max retry count (${MAX_RETRY_COUNT}), not retrying`
          : `Job ${jobId} failed without retry`;
        console.log(`⛔ ${reason}`);

        await this._updatePresentationStatusWithRetry(job.presentationId, "failed");
        console.log(`💥 Presentation ${job.presentationId} status → failed`);
      }

      return job;
    } catch (error) {
      console.error("❌ Error marking job as failed:", error);
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
            [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING],
          },
        },
      });

      let cleanedCount = 0;
      for (const job of orphanedJobs) {
        await job.markAsFailed(
          "Job cleanup: SQS message no longer exists or job was orphaned",
        );
        cleanedCount++;
        console.log(
          `🧹 Cleaned up orphaned job ${job.jobId} for presentation ${presentationId}`,
        );
      }

      return cleanedCount;
    } catch (error) {
      console.error("❌ Error cleaning up orphaned jobs:", error);
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
        throw new Error(
          `Job ${jobId} has reached max retry count (${MAX_RETRY_COUNT})`,
        );
      }

      // Update job for retry
      await job.update({
        status: JOB_STATUS.QUEUED,
        retryCount: job.retryCount + 1,
        errorMessage: null,
        workerName: null,
        startedAt: null,
      });

      // Resend to queue
      await this._sendJobToQueue(job);

      console.log(
        `🔄 Retried job ${jobId}, attempt ${job.retryCount}/${MAX_RETRY_COUNT}`,
      );
      return job;
    } catch (error) {
      console.error("❌ Error retrying job:", error);
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
            [Op.in]: [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING],
          },
        },
        order: [["createdAt", "DESC"]],
      });

      return activeJob;
    } catch (error) {
      console.error("❌ Error getting active job:", error);
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
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Presentation,
            as: "presentation",
            attributes: ["presentationId", "title", "status"],
          },
        ],
      });

      if (jobType) {
        return jobs[0] || null;
      }
      return jobs;
    } catch (error) {
      console.error("❌ Error getting job by presentation:", error);
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
        order: [["createdAt", "ASC"]],
        attributes: [
          "jobId",
          "jobType",
          "status",
          "retryCount",
          "workerName",
          "errorMessage",
          "createdAt",
          "startedAt",
          "completedAt",
        ],
      });
    } catch (error) {
      console.error("❌ Error getting job history:", error);
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
        order: [["createdAt", "ASC"]],
        limit,
        include: [
          {
            model: Presentation,
            as: "presentation",
            attributes: ["presentationId", "title"],
          },
        ],
      });
    } catch (error) {
      console.error("❌ Error getting pending jobs:", error);
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
        order: [["startedAt", "DESC"]],
        include: [
          {
            model: Presentation,
            as: "presentation",
            attributes: ["presentationId", "title"],
          },
        ],
      });
    } catch (error) {
      console.error("❌ Error getting running jobs:", error);
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
        Job.count({ where: { ...where, status: JOB_STATUS.FAILED } }),
      ]);

      return {
        total,
        queued,
        running,
        completed,
        failed,
        successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
      };
    } catch (error) {
      console.error("❌ Error getting job statistics:", error);
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
            [Op.in]: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED],
          },
          completedAt: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      console.log(
        `🧹 Cleaned up ${deletedCount} old jobs (older than ${daysOld} days)`,
      );
      return deletedCount;
    } catch (error) {
      console.error("❌ Error cleaning up old jobs:", error);
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
            [Op.lt]: cutoffDate,
          },
        },
      });

      let resetCount = 0;
      for (const job of stuckJobs) {
        await job.update({
          status: JOB_STATUS.QUEUED,
          workerName: null,
          startedAt: null,
          errorMessage: `Auto-reset: stuck for more than ${hoursStuck} hours`,
        });

        // Resend to queue
        await this._sendJobToQueue(job);
        resetCount++;
      }

      console.log(
        `🔄 Reset ${resetCount} stuck jobs (running > ${hoursStuck} hours)`,
      );
      return resetCount;
    } catch (error) {
      console.error("❌ Error resetting stuck jobs:", error);
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
        include: [
          {
            model: Presentation,
            as: "presentation",
            attributes: ["presentationId", "title", "status"],
          },
        ],
      });

      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      return job;
    } catch (error) {
      console.error("❌ Error getting job by ID:", error);
      throw error;
    }
  }

  /**
   * Get detailed analysis progress for presentation
   * @param {number} presentationId
   * @returns {Promise<object>}
   */
  async getAnalysisProgress(presentationId) {
    try {
      // Get all jobs for this presentation
      const jobs = await Job.findAll({
        where: { presentationId },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Presentation,
            as: "presentation",
            attributes: ["presentationId", "title", "status", "submissionDate"],
          },
        ],
      });

      // Get latest job for each type (for single-job types)
      const jobsByType = {};
      for (const job of jobs) {
        // Slides has multiple jobs per presentation, collect separately
        if (job.jobType !== JOB_TYPES.SLIDES && !jobsByType[job.jobType]) {
          jobsByType[job.jobType] = job;
        }
      }
      const slidesJobs = jobs.filter((j) => j.jobType === JOB_TYPES.SLIDES);

      // Calculate overall progress
      const totalSteps = 4; // ASR -> Semantic -> Report -> Slides
      let completedSteps = 0;
      let currentStep = null;
      let currentStepProgress = 0;

      // Define step order and names
      const stepOrder = [
        { type: JOB_TYPES.SLIDES, name: "Phân tích slides", order: 1 },
        {
          type: JOB_TYPES.ASR,
          name: "Chuyển đổi giọng nói thành văn bản",
          order: 2,
        },
        {
          type: JOB_TYPES.SEMANTIC,
          name: "Phân tích ngữ nghĩa và nội dung",
          order: 3,
        },
        { type: JOB_TYPES.REPORT, name: "Tạo báo cáo đánh giá", order: 4 },
      ];

      const stepDetails = [];

      for (const step of stepOrder) {
        const isSlides = step.type === JOB_TYPES.SLIDES;
        const job = isSlides ? null : jobsByType[step.type];
        const jobsForStep = isSlides ? slidesJobs : job ? [job] : [];
        let stepStatus = "pending";
        let stepProgress = 0;
        let estimatedDuration = null;
        let actualDuration = null;
        let errorMessage = null;
        let representativeJob = job || jobsForStep[0] || null;

        if (isSlides) {
          if (slidesJobs.length === 0) {
            // No slides to process - treat as completed (N/A)
            stepStatus = "completed";
            stepProgress = 100;
            completedSteps++;
          } else {
            const completed = slidesJobs.filter(
              (j) => j.status === JOB_STATUS.COMPLETED,
            ).length;
            const running = slidesJobs.filter(
              (j) => j.status === JOB_STATUS.RUNNING,
            );
            const queued = slidesJobs.filter(
              (j) => j.status === JOB_STATUS.QUEUED,
            );
            const failed = slidesJobs.filter(
              (j) => j.status === JOB_STATUS.FAILED,
            );
            const total = slidesJobs.length;
            stepProgress =
              total > 0 ? Math.floor((completed / total) * 100) : 0;
            estimatedDuration =
              this._getEstimatedDuration(step.type) *
              Math.max(1, total - completed);
            if (failed.length > 0) {
              stepStatus = "failed";
              errorMessage = failed[0].errorMessage;
            } else if (running.length > 0) {
              stepStatus = "running";
              currentStep = step.name;
              currentStepProgress = stepProgress;
              representativeJob = running[0];
              if (representativeJob.startedAt) {
                actualDuration = Math.floor(
                  (Date.now() -
                    new Date(representativeJob.startedAt).getTime()) /
                    1000,
                );
              }
            } else if (queued.length > 0) {
              stepStatus = "queued";
              stepProgress = stepProgress || 10;
              representativeJob = queued[0];
            } else if (completed === total) {
              stepStatus = "completed";
              stepProgress = 100;
              completedSteps++;
              representativeJob = slidesJobs[0];
            }
          }
        } else if (job) {
          switch (job.status) {
            case JOB_STATUS.QUEUED:
              stepStatus = "queued";
              stepProgress = 10;
              estimatedDuration = this._getEstimatedDuration(step.type);
              break;
            case JOB_STATUS.RUNNING:
              stepStatus = "running";
              stepProgress = 50;
              currentStep = step.name;
              currentStepProgress = 50;
              estimatedDuration = this._getEstimatedDuration(step.type);
              if (job.startedAt) {
                const elapsed = Date.now() - new Date(job.startedAt).getTime();
                actualDuration = Math.floor(elapsed / 1000);
              }
              break;
            case JOB_STATUS.COMPLETED:
              stepStatus = "completed";
              stepProgress = 100;
              completedSteps++;
              if (job.startedAt && job.completedAt) {
                actualDuration = Math.floor(
                  (new Date(job.completedAt) - new Date(job.startedAt)) / 1000,
                );
              }
              break;
            case JOB_STATUS.FAILED:
              stepStatus = "failed";
              stepProgress = 0;
              errorMessage = job.errorMessage;
              if (job.startedAt && job.completedAt) {
                actualDuration = Math.floor(
                  (new Date(job.completedAt) - new Date(job.startedAt)) / 1000,
                );
              }
              break;
          }
        }

        stepDetails.push({
          type: step.type,
          name: step.name,
          order: step.order,
          status: stepStatus,
          progress: stepProgress,
          estimatedDuration,
          actualDuration,
          errorMessage,
          jobId: representativeJob?.jobId || null,
          jobCount: isSlides ? slidesJobs.length : null,
          completedCount: isSlides
            ? slidesJobs.filter((j) => j.status === JOB_STATUS.COMPLETED).length
            : null,
          startedAt: representativeJob?.startedAt || null,
          completedAt: representativeJob?.completedAt || null,
          retryCount: representativeJob?.retryCount || 0,
        });
      }

      // Calculate overall progress percentage
      const overallProgress = Math.floor((completedSteps / totalSteps) * 100);

      // Determine overall status
      let overallStatus = "pending";
      const hasFailedJob = stepDetails.some((step) => step.status === "failed");
      const hasRunningJob = stepDetails.some(
        (step) => step.status === "running",
      );
      const allCompleted = stepDetails.every(
        (step) => step.status === "completed",
      );

      if (hasFailedJob) {
        overallStatus = "failed";
      } else if (allCompleted) {
        overallStatus = "completed";
      } else if (hasRunningJob) {
        overallStatus = "running";
      } else if (stepDetails.some((step) => step.status === "queued")) {
        overallStatus = "queued";
      }

      // Get presentation info
      const presentation =
        jobs[0]?.presentation ||
        (await Presentation.findByPk(presentationId, {
          attributes: ["presentationId", "title", "status", "submissionDate"],
        }));

      // Calculate estimated completion time
      let estimatedCompletionTime = null;
      if (overallStatus === "running" || overallStatus === "queued") {
        const remainingSteps = stepDetails.filter(
          (step) =>
            step.status === "pending" ||
            step.status === "queued" ||
            step.status === "running",
        );
        const totalEstimatedSeconds = remainingSteps.reduce((sum, step) => {
          return sum + (step.estimatedDuration || 0);
        }, 0);

        if (totalEstimatedSeconds > 0) {
          estimatedCompletionTime = new Date(
            Date.now() + totalEstimatedSeconds * 1000,
          );
        }
      }

      return {
        presentationId,
        presentationTitle: presentation?.title || "Unknown",
        presentationStatus: presentation?.status || "unknown",
        submittedAt: presentation?.submissionDate || null,
        overallStatus,
        overallProgress,
        currentStep,
        currentStepProgress,
        estimatedCompletionTime,
        totalSteps,
        completedSteps,
        steps: stepDetails,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("❌ Error getting analysis progress:", error);
      throw error;
    }
  }

  /**
   * Get estimated duration for job type (in seconds)
   * @private
   */
  _getEstimatedDuration(jobType) {
    const estimations = {
      [JOB_TYPES.ASR]: 120, // 2 minutes
      [JOB_TYPES.SEMANTIC]: 180, // 3 minutes
      [JOB_TYPES.REPORT]: 60, // 1 minute
      [JOB_TYPES.SLIDES]: 30, // ~30 seconds per slide
    };
    return estimations[jobType] || 60;
  }
}

// Export singleton instance
export default new JobService();
