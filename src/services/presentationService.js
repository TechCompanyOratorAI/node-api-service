import crypto from "crypto";
import path from "path";
import db from "../models/index.js";
import storageService from "./storageService.js";
import jobService from "./jobService.js";
import speakerService from "./speakerService.js";
import { emitJobEvent } from "../websocket/emitters.js";

const {
  Presentation,
  Topic,
  TopicEnrollment,
  Slide,
  AudioRecord,
  Transcript,
  TranscriptSegment,
  Job,
  Speaker,
  Feedback,
  AnalysisResult,
  SegmentAnalysis,
  User,
  Course,
  Class,
  Enrollment,
  GroupStudent,
  Group,
} = db;

const sanitizeFileName = (filename) => {
  const baseName = path.basename(filename || "file");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

/**
 * Detect number of pages in a slide file
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<number>} - Number of pages
 */
const detectPageCount = async (fileBuffer, mimeType) => {
  try {
    // PDF files
    if (mimeType === "application/pdf" || mimeType === "application/x-pdf") {
      // Try to count pages by searching for /Count in PDF structure
      // Simple method: count occurrences of /Type/Page or /Page
      const pdfText = fileBuffer.toString("binary");
      const pageMatches = pdfText.match(/\/Type[\s]*\/Page[^s]/g);
      if (pageMatches) {
        return pageMatches.length;
      }

      // Alternative: count /Count entries (less reliable)
      const countMatches = pdfText.match(/\/Count[\s]+(\d+)/g);
      if (countMatches) {
        // Try to extract the largest count value
        const counts = countMatches.map((match) => {
          const numMatch = match.match(/\d+/);
          return numMatch ? parseInt(numMatch[0]) : 0;
        });
        return Math.max(...counts, 1);
      }

      // Fallback: estimate based on file size (very rough)
      // Average PDF page is ~50-100KB, but this is unreliable
      return 1; // Default to 1 if can't detect
    }

    // PowerPoint files (.pptx)
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.ms-powerpoint"
    ) {
      // PPTX is a ZIP file, count slides by counting slide XML files
      // This requires unzipping, which is complex. For now, return 1.
      // TODO: Implement proper PPTX page counting using JSZip or similar
      return 1; // Placeholder
    }

    // Image files (single page)
    if (mimeType.startsWith("image/")) {
      return 1;
    }

    // Default: assume 1 page
    return 1;
  } catch (error) {
    console.error("Error detecting page count:", error);
    return 1; // Default to 1 page on error
  }
};

class PresentationService {
  async createPresentation({
    classId,
    topicId,
    studentId,
    title,
    description,
    groupCode,
  }) {
    try {
      // Step 1: Validate classId is provided
      if (!classId) {
        return { success: false, message: "Class ID is required" };
      }

      // Step 2: Validate class exists and get class data
      const classData = await Class.findByPk(classId, {
        include: [{ model: Course, as: "course" }],
      });

      if (!classData) {
        return { success: false, message: "Class not found" };
      }

      // Step 3: Validate student is enrolled in the class
      const classEnrollment = await Enrollment.findOne({
        where: {
          studentId,
          classId,
          status: "enrolled",
        },
      });

      if (!classEnrollment) {
        return {
          success: false,
          message: "You are not enrolled in this class",
        };
      }

      // Step 4: Validate topic exists and belongs to this class directly
      const topic = await Topic.findByPk(topicId);

      if (!topic) {
        return { success: false, message: "Topic not found" };
      }

      if (topic.classId !== parseInt(classId)) {
        return {
          success: false,
          message: "Topic does not belong to this class",
        };
      }

      // Step 5: Check topic enrollment via group (if student is in a group)
      // Nếu sinh viên thuộc nhóm → kiểm tra nhóm đã chọn topic này chưa
      // Nếu không thuộc nhóm → kiểm tra individual enrollment
      const groupMembership = await GroupStudent.findOne({
        where: { studentId },
        include: [
          {
            model: Group,
            as: "group",
            where: { classId },
            attributes: ["groupId"],
          },
        ],
      });

      if (groupMembership) {
        // Group-based check: group must have selected this topic
        const groupTopicEnrollment = await TopicEnrollment.findOne({
          where: {
            topicId,
            groupId: groupMembership.group.groupId,
            status: "enrolled",
          },
        });

        if (!groupTopicEnrollment) {
          return {
            success: false,
            message:
              "Nh\u00f3m ch\u01b0a ch\u1ecdn topic n\u00e0y. Tr\u01b0\u1edfng nh\u00f3m c\u1ea7n ch\u1ecdn topic tr\u01b0\u1edbc khi t\u1ea1o b\u00e0i thuy\u1ebft tr\u00ecnh",
          };
        }
      } else {
        // Individual check (fallback for students not in a group)
        const topicEnrollment = await TopicEnrollment.findOne({
          where: { topicId, studentId, status: "enrolled" },
        });

        if (!topicEnrollment) {
          return {
            success: false,
            message: "You are not enrolled in this topic",
          };
        }
      }

      // Step 6: Create presentation with classId
      const presentation = await Presentation.create({
        studentId,
        classId,
        courseId: classData.courseId,
        topicId,
        title,
        description,
        groupCode,
        status: "draft",
      });

      return { success: true, presentation };
    } catch (error) {
      console.error("Create presentation error:", error);
      return {
        success: false,
        message: "Failed to create presentation",
        error: error.message,
      };
    }
  }

  async uploadSlide({ presentationId, studentId, slideNumber, file }) {
    const transaction = await db.sequelize.transaction();

    try {
      const accessResult = await this.getPresentationForStudent(
        presentationId,
        studentId,
      );
      if (!accessResult.success) {
        await transaction.rollback();
        return accessResult;
      }

      const presentation = accessResult.presentation;

      // Kiểm tra upload permission nếu có classId
      if (presentation.classId) {
        const { Class } = db;
        const classRecord = await Class.findByPk(presentation.classId);
        if (classRecord && !classRecord.isUploadEnabled) {
          await transaction.rollback();
          return {
            success: false,
            message: "Lớp học chưa mở cho phép upload bài thuyết trình. Vui lòng đợi giảng viên mở.",
            uploadLocked: true,
          };
        }
      }


      // Get existing slides to delete their files from storage
      const existingSlides = await Slide.findAll({
        where: { presentationId },
        transaction,
      });

      // Delete old slide files from storage
      for (const oldSlide of existingSlides) {
        try {
          if (oldSlide.filePath) {
            // Extract key from S3 URL for deletion
            // URL format: https://bucket.s3.region.amazonaws.com/key/path
            const url = new URL(oldSlide.filePath);
            const key = url.pathname.substring(1); // Remove leading slash
            await storageService.deleteFile(key);
          }
        } catch (deleteError) {
          console.warn(
            `⚠️ Failed to delete old slide file ${oldSlide.filePath}:`,
            deleteError,
          );
          // Continue even if file deletion fails
        }
      }

      // Clear segment analyses related to this presentation
      await SegmentAnalysis.destroy({
        where: {
          segmentId: {
            [db.Sequelize.Op.in]: db.sequelize.literal(`
              (SELECT ts.segmentId FROM TranscriptSegments ts 
               JOIN Transcripts t ON ts.transcriptId = t.transcriptId 
               WHERE t.presentationId = ${presentationId})
            `),
          },
        },
        transaction,
      });

      // Clear analysis results for this presentation
      await AnalysisResult.destroy({
        where: { presentationId },
        transaction,
      });

      // Clear feedback for this presentation
      await Feedback.destroy({
        where: { presentationId },
        transaction,
      });

      // Delete old slides from database
      await Slide.destroy({
        where: { presentationId },
        transaction,
      });


      // Detect number of pages in the file
      const pageCount = await detectPageCount(file.buffer, file.mimetype);

      // Use pageCount as slideNumber (or use provided slideNumber if specified)
      // slideNumber represents the number of pages in this slide file
      const finalSlideNumber = slideNumber || pageCount;


      const extension = path.extname(file.originalname || "");
      const uniqueSuffix = crypto.randomBytes(6).toString("hex");
      const safeName = sanitizeFileName(
        file.originalname || `slide-${finalSlideNumber}${extension}`,
      );
      const key = `presentations/${presentation.presentationId}/slides/${finalSlideNumber}-${uniqueSuffix}-${safeName}`;

      const uploadResult = await storageService.uploadBuffer({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });

      const slide = await Slide.create(
        {
          presentationId: presentation.presentationId,
          slideNumber: finalSlideNumber,
          filePath: uploadResult.url,
          fileName: file.originalname,
          fileFormat: file.mimetype,
          fileSizeBytes: file.size,
          uploadedAt: new Date(),
        },
        { transaction },
      );

      await transaction.commit();

      // NOTE: Slide job (OCR) is NOT created here.
      // Jobs are created only when the user clicks Submit or Resubmit,
      // keeping upload consistent with uploadMedia() and avoiding race
      // conditions from stale SQS messages.

      return { success: true, slide };
    } catch (error) {
      await transaction.rollback();
      console.error("Upload slide error:", error);
      return {
        success: false,
        message: "Failed to upload slide",
        error: error.message,
      };
    }
  }

  async uploadMedia({
    presentationId,
    studentId,
    file,
    durationSeconds,
    sampleRate,
    recordingMethod,
  }) {
    try {
      const accessResult = await this.getPresentationForStudent(
        presentationId,
        studentId,
      );
      if (!accessResult.success) {
        return accessResult;
      }

      const presentation = accessResult.presentation;

      // Kiểm tra upload permission nếu có classId
      if (presentation.classId) {
        const { Class } = db;
        const classRecord = await Class.findByPk(presentation.classId);
        if (classRecord && !classRecord.isUploadEnabled) {
          return {
            success: false,
            message: "Lớp học chưa mở cho phép upload bài thuyết trình. Vui lòng đợi giảng viên mở.",
            uploadLocked: true,
          };
        }
      }

      const extension = path.extname(file.originalname || "");
      const uniqueSuffix = crypto.randomBytes(6).toString("hex");
      const safeName = sanitizeFileName(
        file.originalname || `media${extension}`,
      );
      const key = `presentations/${
        presentation.presentationId
      }/media/${Date.now()}-${uniqueSuffix}-${safeName}`;

      const uploadResult = await storageService.uploadBuffer({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });

      const payload = {
        presentationId: presentation.presentationId,
        filePath: uploadResult.url,
        fileName: file.originalname,
        fileFormat: file.mimetype,
        fileSizeBytes: file.size,
        durationSeconds: durationSeconds || null,
        sampleRate: sampleRate || null,
        recordingMethod: recordingMethod || "upload",
        uploadedAt: new Date(),
      };

      const existing = await AudioRecord.findOne({
        where: { presentationId: presentation.presentationId },
      });

      let audioRecord = null;
      if (existing) {
        await AudioRecord.update(payload, {
          where: { presentationId: presentation.presentationId },
        });
        audioRecord = await AudioRecord.findOne({
          where: { presentationId: presentation.presentationId },
        });
      } else {
        audioRecord = await AudioRecord.create(payload);
      }

      if (durationSeconds && !presentation.durationSeconds) {
        await Presentation.update(
          { durationSeconds },
          { where: { presentationId: presentation.presentationId } },
        );
      }

      return { success: true, audioRecord };
    } catch (error) {
      console.error("Upload media error:", error);
      return {
        success: false,
        message: "Failed to upload media",
        error: error.message,
      };
    }
  }

  async getPresentationForStudent(presentationId, studentId) {
    try {
      const presentation = await Presentation.findOne({
        where: { presentationId, studentId },
      });

      if (!presentation) {
        return {
          success: false,
          message: "Presentation not found or access denied",
        };
      }

      const groupMembership = await GroupStudent.findOne({
        where: { studentId },
        include: [
          {
            model: Group,
            as: "group",
            where: { classId: presentation.classId },
            attributes: ["groupId"],
          },
        ],
      });

      if (groupMembership) {
        const groupTopicEnrollment = await TopicEnrollment.findOne({
          where: {
            topicId: presentation.topicId,
            groupId: groupMembership.group.groupId,
            status: "enrolled",
          },
        });

        if (!groupTopicEnrollment) {
          return {
            success: false,
            message: "Nh\u00f3m ch\u01b0a ch\u1ecdn topic n\u00e0y",
          };
        }
      } else {
        // Individual fallback
        const enrollment = await TopicEnrollment.findOne({
          where: {
            topicId: presentation.topicId,
            studentId,
            status: "enrolled",
          },
        });

        if (!enrollment) {
          return {
            success: false,
            message: "You are not enrolled in this topic",
          };
        }
      }

      return { success: true, presentation };
    } catch (error) {
      console.error("Get presentation access error:", error);
      return {
        success: false,
        message: "Failed to verify presentation access",
        error: error.message,
      };
    }
  }

  /**
   * Submit presentation for processing
   * Validates completeness → Creates ASR job → Pushes to SQS queue
   * @param {number} presentationId
   * @param {number} studentId
   * @returns {Promise<object>}
   */
  async submitPresentation(presentationId, studentId) {
    try {
      // Verify access
      const accessResult = await this.getPresentationForStudent(
        presentationId,
        studentId,
      );
      if (!accessResult.success) {
        return accessResult;
      }

      const presentation = accessResult.presentation;

      // Validate presentation is complete
      const validationResult =
        await this.validatePresentationForSubmission(presentationId);
      if (!validationResult.isValid) {
        return {
          success: false,
          message: "Presentation is not ready for submission",
          validation: validationResult,
        };
      }

      // Check if already submitted (allow re-submit if failed or no active job)
      if (presentation.status === "completed") {
        return {
          success: false,
          message: "Presentation is already completed",
        };
      }

      // If processing, cleanup orphaned jobs first, then check for active jobs
      if (presentation.status === "processing") {
        // Cleanup any orphaned jobs (queued/running but SQS message deleted)
        const cleanedCount =
          await jobService.cleanupOrphanedJobs(presentationId);

        // Re-check for active jobs after cleanup
        const activeJob =
          await jobService.getActiveJobForPresentation(presentationId);
        if (activeJob) {
          return {
            success: false,
            message: "Presentation is already being processed",
            job: activeJob,
          };
        }
        // If no active job after cleanup, allow re-submit
      }

      // ─── Cleanup stale jobs and old analysis data (for all non-draft statuses) ───
      // This runs for every submit so stale SQS workers that callback later will
      // receive "job not found" and safely acknowledge without side effects.
      if (presentation.status !== "draft") {
        await Job.destroy({ where: { presentationId } });
        console.log(`🧹 [Submit] Cleared old jobs for presentation ${presentationId}`);

        const transcripts = await Transcript.findAll({
          where: { presentationId },
          attributes: ["transcriptId"],
        });
        const transcriptIds = transcripts.map((t) => t.transcriptId);

        if (transcriptIds.length > 0) {
          await SegmentAnalysis.destroy({
            where: {
              segmentId: {
                [db.Sequelize.Op.in]: db.sequelize.literal(
                  `(SELECT segmentId FROM TranscriptSegments WHERE transcriptId IN (${transcriptIds.join(",")}))`,
                ),
              },
            },
          });
          await TranscriptSegment.destroy({
            where: { transcriptId: { [db.Sequelize.Op.in]: transcriptIds } },
          });
          await Transcript.destroy({ where: { presentationId } });
        }

        await Feedback.destroy({ where: { presentationId } });
        await AnalysisResult.destroy({ where: { presentationId } });
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Update presentation status
      await Presentation.update(
        {
          status: "processing",
          submissionDate: new Date(),
        },
        { where: { presentationId } },
      );

      // Create slide jobs for all existing slides (unified: always at submit time)
      const slides = await Slide.findAll({ where: { presentationId } });
      for (const slide of slides) {
        try {
          await jobService.createJob(presentationId, "slides", {
            slideId: slide.slideId,
            slideUrl: slide.filePath,
            slideNumber: slide.slideNumber,
            fileName: slide.fileName,
            fileFormat: slide.fileFormat,
          });
          console.log(`📤 [Submit] Slide OCR job created for slide ${slide.slideId}`);
        } catch (slideJobError) {
          console.error("⚠️ [Submit] Failed to create slide job:", slideJobError);
        }
      }

      // Create ASR job (this will also push to SQS queue)
      const job = await jobService.createJob(presentationId, "asr", {
        submittedBy: studentId,
        submittedAt: new Date().toISOString(),
      });

      const isResubmit = presentation.status === "failed";

      // Emit WebSocket event so student UI knows processing started
      emitJobEvent("started", presentationId, {
        jobType: "asr",
        jobId: job.jobId,
        message: "Đang xử lý bài thuyết trình...",
      });

      return {
        success: true,
        message: isResubmit
          ? "Presentation resubmitted successfully. It is being processed again."
          : "Presentation submitted successfully",
        presentation: await this.getPresentationById(presentationId, studentId),
        job,
      };
    } catch (error) {
      console.error("Submit presentation error:", error);
      return {
        success: false,
        message: "Failed to submit presentation",
        error: error.message,
      };
    }
  }

  /**
   * Resubmit presentation after failure (failed → processing)
   * Only allows resubmit when presentation status is "failed"
   * @param {number} presentationId
   * @param {number} studentId
   * @returns {Promise<object>}
   */
  async resubmitPresentation(presentationId, studentId) {
    try {
      // Verify access
      const accessResult = await this.getPresentationForStudent(
        presentationId,
        studentId,
      );
      if (!accessResult.success) {
        return accessResult;
      }

      const presentation = accessResult.presentation;

      // Only allow resubmit when status is "failed"
      if (presentation.status !== "failed") {
        return {
          success: false,
          message: `Cannot resubmit presentation with status "${presentation.status}". Only failed presentations can be resubmitted.`,
        };
      }

      // Validate presentation still has required files
      const validationResult =
        await this.validatePresentationForSubmission(presentationId);
      if (!validationResult.isValid) {
        return {
          success: false,
          message:
            "Presentation is not ready for resubmission. " +
            validationResult.errors.join(" "),
          validation: validationResult,
        };
      }

      // ─── Full cleanup before restarting pipeline ────────────────────────────
      // CRITICAL: Delete ALL old jobs so that stale SQS messages processed by
      // workers after this point will get a "job not found" response from the
      // webhook and be safely acknowledged without side-effects.

      // 1. Delete all existing jobs for this presentation
      await Job.destroy({
        where: { presentationId },
      });
      console.log(`🧹 Cleared all jobs for presentation ${presentationId} before resubmit`);

      // 2. Clear old analysis data
      const transcripts = await Transcript.findAll({
        where: { presentationId },
        attributes: ["transcriptId"],
      });
      const transcriptIds = transcripts.map((t) => t.transcriptId);

      if (transcriptIds.length > 0) {
        await SegmentAnalysis.destroy({
          where: {
            segmentId: {
              [db.Sequelize.Op.in]: db.sequelize.literal(
                `(SELECT segmentId FROM TranscriptSegments WHERE transcriptId IN (${transcriptIds.join(",")}))`,
              ),
            },
          },
        });
        await TranscriptSegment.destroy({
          where: { transcriptId: { [db.Sequelize.Op.in]: transcriptIds } },
        });
        await Transcript.destroy({
          where: { presentationId },
        });
      }

      await Feedback.destroy({ where: { presentationId } });
      await AnalysisResult.destroy({ where: { presentationId } });

      // 3. Recreate slide jobs for all existing slides so OCR restarts cleanly
      const slides = await Slide.findAll({ where: { presentationId } });
      for (const slide of slides) {
        try {
          await jobService.createJob(presentationId, "slides", {
            slideId: slide.slideId,
            slideUrl: slide.filePath,
            slideNumber: slide.slideNumber,
            fileName: slide.fileName,
            fileFormat: slide.fileFormat,
            resubmitted: true,
          });
          console.log(
            `📤 Recreated slide OCR job for slide ${slide.slideId} (presentation ${presentationId})`,
          );
        } catch (slideJobError) {
          console.error("⚠️ Failed to recreate slides job:", slideJobError);
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      // Update presentation status back to processing
      await Presentation.update(
        {
          status: "processing",
          submissionDate: new Date(),
        },
        { where: { presentationId } },
      );

      // Create ASR job to restart the pipeline
      const job = await jobService.createJob(presentationId, "asr", {
        resubmittedBy: studentId,
        resubmittedAt: new Date().toISOString(),
        reason: "Resubmit after failure",
      });

      // Emit WebSocket event so student UI knows processing restarted
      emitJobEvent("started", presentationId, {
        jobType: "asr",
        jobId: job.jobId,
        message: "Đang xử lý lại bài thuyết trình...",
      });

      return {
        success: true,
        message:
          "Presentation resubmitted successfully. It is being processed again.",
        presentation: await this.getPresentationById(presentationId, studentId),
        job,
      };
    } catch (error) {
      console.error("Resubmit presentation error:", error);
      return {
        success: false,
        message: "Failed to resubmit presentation",
        error: error.message,
      };
    }
  }

  /**
   * Validate presentation is ready for submission
   * @param {number} presentationId
   * @returns {Promise<object>}
   */
  async validatePresentationForSubmission(presentationId) {
    try {
      const presentation = await Presentation.findByPk(presentationId, {
        include: [
          { model: Slide, as: "slides" },
          { model: AudioRecord, as: "audioRecord" },
        ],
      });

      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      if (!presentation) {
        validation.isValid = false;
        validation.errors.push("Presentation not found");
        return validation;
      }

      // Check for audio
      if (!presentation.audioRecord) {
        validation.isValid = false;
        validation.errors.push("Audio file is required");
      }

      // Check for slides
      if (!presentation.slides || presentation.slides.length === 0) {
        validation.warnings.push(
          "No slides uploaded - analysis will be limited",
        );
      }

      // Check presentation metadata
      if (!presentation.title || presentation.title.trim() === "") {
        validation.warnings.push("Presentation title is empty");
      }

      return validation;
    } catch (error) {
      console.error("Validation error:", error);
      return {
        isValid: false,
        errors: ["Validation failed: " + error.message],
      };
    }
  }

  /**
   * Get presentation by ID with full details
   * @param {number} presentationId
   * @param {number} userId - For access control
   * @param {string} userRole - Optional role for permission check
   * @returns {Promise<object>}
   */
  async getPresentationById(presentationId, userId, userRole = null) {
    try {
      const presentation = await Presentation.findByPk(presentationId, {
        include: [
          {
            model: User,
            as: "student",
            attributes: ["userId", "firstName", "lastName", "email"],
          },
          {
            model: Topic,
            as: "topic",
            attributes: ["topicId", "topicName", "courseId"],
          },
          {
            model: Course,
            as: "course",
            attributes: ["courseId", "courseName"],
          },
          {
            model: Slide,
            as: "slides",
            attributes: ["slideId", "slideNumber", "fileName", "filePath"],
          },
          {
            model: AudioRecord,
            as: "audioRecord",
            attributes: ["audioId", "fileName", "filePath", "durationSeconds"],
          },
        ],
      });

      if (!presentation) {
        return { success: false, message: "Presentation not found" };
      }

      // Access control
      const hasAccess = await this.checkPresentationAccess(
        presentationId,
        userId,
        userRole,
      );
      if (!hasAccess) {
        return { success: false, message: "Access denied" };
      }

      return { success: true, presentation };
    } catch (error) {
      console.error("Get presentation error:", error);
      return {
        success: false,
        message: "Failed to get presentation",
        error: error.message,
      };
    }
  }

  /**
   * Get all presentations for a student
   * @param {number} studentId
   * @param {object} options - {status, limit, offset}
   * @returns {Promise<object>}
   */
  async getAllPresentations(studentId, options = {}) {
    try {
      const { status, classId, topicId, limit = 50, offset = 0 } = options;

      // ── 1. Presentations tự làm (owner) ──
      const ownWhere = { studentId };
      if (status) ownWhere.status = status;
      if (classId) ownWhere.classId = parseInt(classId);
      if (topicId) ownWhere.topicId = parseInt(topicId);

      // ── 2. Tìm presentation của nhóm mình thuộc ──
      // Lấy tất cả group mà sinh viên là member
      const memberships = await GroupStudent.findAll({
        where: { studentId },
        include: [{ model: Group, as: "group", attributes: ["groupId", "classId"] }],
      });

      let groupPresentationIds = [];
      if (memberships.length > 0) {
        for (const m of memberships) {
          const group = m.group;
          if (!group) continue;

          // Lấy tất cả studentId trong nhóm này
          const groupMembers = await GroupStudent.findAll({
            where: { groupId: group.groupId },
            attributes: ["studentId"],
          });
          const memberIds = groupMembers.map((gm) => gm.studentId).filter((id) => id !== studentId);

          if (memberIds.length === 0) continue;

          // Tìm presentation của các member khác trong cùng group + cùng class
          const groupPresentationWhere = {
            studentId: { [db.Sequelize.Op.in]: memberIds },
            classId: group.classId,
          };
          if (status) groupPresentationWhere.status = status;
          if (topicId) groupPresentationWhere.topicId = parseInt(topicId);

          const gps = await Presentation.findAll({
            where: groupPresentationWhere,
            attributes: ["presentationId"],
          });
          groupPresentationIds.push(...gps.map((p) => p.presentationId));
        }
      }

      // ── 3. Merge: own presentations OR group presentations ──
      const mergedWhere = groupPresentationIds.length > 0
        ? {
            [db.Sequelize.Op.or]: [
              ownWhere,
              { presentationId: { [db.Sequelize.Op.in]: groupPresentationIds } },
            ],
          }
        : ownWhere;

      const presentations = await Presentation.findAndCountAll({
        where: mergedWhere,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Class,
            as: "class",
            attributes: ["classId", "classCode"],
          },
          {
            model: Topic,
            as: "topic",
            attributes: ["topicId", "topicName"],
          },
          {
            model: AudioRecord,
            as: "audioRecord",
            attributes: ["audioId", "durationSeconds"],
          },
          {
            model: User,
            as: "student",
            attributes: ["userId", "firstName", "lastName"],
          },
        ],
      });

      return {
        success: true,
        presentations: presentations.rows,
        total: presentations.count,
        limit,
        offset,
      };
    } catch (error) {
      console.error("Get all presentations error:", error);
      return {
        success: false,
        message: "Failed to get presentations",
        error: error.message,
      };
    }
  }

  /**
   * Update presentation
   * @param {number} presentationId
   * @param {number} studentId
   * @param {object} updates - {title, description}
   * @returns {Promise<object>}
   */
  async updatePresentation(presentationId, studentId, updates) {
    try {
      const accessResult = await this.getPresentationForStudent(
        presentationId,
        studentId,
      );
      if (!accessResult.success) {
        return accessResult;
      }

      const allowedFields = ["title", "description", "groupCode"];
      const updateData = {};

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateData[key] = updates[key];
        }
      });

      await Presentation.update(updateData, {
        where: { presentationId, studentId },
      });

      const presentation = await Presentation.findByPk(presentationId);

      return { success: true, presentation };
    } catch (error) {
      console.error("Update presentation error:", error);
      return {
        success: false,
        message: "Failed to update presentation",
        error: error.message,
      };
    }
  }

  /**
   * Delete presentation and all related data
   * @param {number} presentationId
   * @param {number} studentId
   * @returns {Promise<object>}
   */
  async deletePresentation(presentationId, studentId) {
    const transaction = await db.sequelize.transaction();

    try {
      const accessResult = await this.getPresentationForStudent(
        presentationId,
        studentId,
      );
      if (!accessResult.success) {
        await transaction.rollback();
        return accessResult;
      }

      const presentation = accessResult.presentation;

      // Get file URLs for deletion
      const slides = await Slide.findAll({
        where: { presentationId },
        attributes: ["filePath"],
      });

      const audioRecord = await AudioRecord.findOne({
        where: { presentationId },
        attributes: ["filePath"],
      });

      // Delete from database (cascade will handle related records)
      await Presentation.destroy({
        where: { presentationId },
        transaction,
      });

      await transaction.commit();

      // Delete files from S3 (async, don't wait)
      const filesToDelete = [];
      slides.forEach((slide) => {
        const key = storageService.extractKeyFromUrl(slide.filePath);
        if (key) filesToDelete.push(key);
      });

      if (audioRecord) {
        const key = storageService.extractKeyFromUrl(audioRecord.filePath);
        if (key) filesToDelete.push(key);
      }

      if (filesToDelete.length > 0) {
        storageService.deleteMultipleFiles(filesToDelete).catch((error) => {
          console.error("Error deleting files from S3:", error);
        });
      }

      return { success: true, message: "Presentation deleted successfully" };
    } catch (error) {
      await transaction.rollback();
      console.error("Delete presentation error:", error);
      return {
        success: false,
        message: "Failed to delete presentation",
        error: error.message,
      };
    }
  }

  /**
   * Get processing status for presentation
   * @param {number} presentationId
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getProcessingStatus(presentationId, userId) {
    try {
      // Check access
      const hasAccess = await this.checkPresentationAccess(
        presentationId,
        userId,
      );
      if (!hasAccess) {
        return { success: false, message: "Access denied" };
      }

      const presentation = await Presentation.findByPk(presentationId, {
        attributes: ["presentationId", "title", "status", "submissionDate"],
      });

      if (!presentation) {
        return { success: false, message: "Presentation not found" };
      }

      // Get all jobs for this presentation
      const jobs = await jobService.getJobHistory(presentationId);

      // Get job statistics
      const stats = await jobService.getJobStatistics(presentationId);

      // Get current/latest job for each type
      const asrJob = await jobService.getJobByPresentation(
        presentationId,
        "asr",
      );
      const semanticJob = await jobService.getJobByPresentation(
        presentationId,
        "semantic",
      );
      const reportJob = await jobService.getJobByPresentation(
        presentationId,
        "report",
      );

      const pipeline = {
        asr: asrJob
          ? {
              status: asrJob.status,
              startedAt: asrJob.startedAt,
              completedAt: asrJob.completedAt,
              error: asrJob.errorMessage,
            }
          : null,
        semantic: semanticJob
          ? {
              status: semanticJob.status,
              startedAt: semanticJob.startedAt,
              completedAt: semanticJob.completedAt,
              error: semanticJob.errorMessage,
            }
          : null,
        report: reportJob
          ? {
              status: reportJob.status,
              startedAt: reportJob.startedAt,
              completedAt: reportJob.completedAt,
              error: reportJob.errorMessage,
            }
          : null,
      };

      return {
        success: true,
        status: {
          presentationStatus: presentation.status,
          submittedAt: presentation.submissionDate,
          pipeline,
          jobs: jobs.length,
          statistics: stats,
        },
      };
    } catch (error) {
      console.error("Get processing status error:", error);
      return {
        success: false,
        message: "Failed to get processing status",
        error: error.message,
      };
    }
  }

  /**
   * Get analysis results for presentation
   * @param {number} presentationId
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getAnalysisResults(presentationId, userId) {
    try {
      // Check access
      const hasAccess = await this.checkPresentationAccess(
        presentationId,
        userId,
      );
      if (!hasAccess) {
        return { success: false, message: "Access denied" };
      }

      const presentation = await Presentation.findByPk(presentationId, {
        include: [
          {
            model: Transcript,
            as: "transcript",
            include: [
              {
                model: TranscriptSegment,
                as: "segments",
                include: [
                  {
                    model: Speaker,
                    as: "speaker",
                    include: [
                      {
                        model: User,
                        as: "mappedStudent",
                        attributes: ["userId", "firstName", "lastName"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: Speaker,
            as: "speakers",
            include: [
              {
                model: User,
                as: "mappedStudent",
                attributes: ["userId", "firstName", "lastName"],
              },
            ],
          },
          {
            model: Feedback,
            as: "feedbacks",
          },
          {
            model: AnalysisResult,
            as: "analysisResults",
          },
        ],
      });

      if (!presentation) {
        return { success: false, message: "Presentation not found" };
      }

      // Get speaker statistics
      const speakerStats =
        presentation.speakers.length > 0
          ? await speakerService.getSpeakerStatistics(presentationId)
          : null;

      return {
        success: true,
        results: {
          presentationId,
          status: presentation.status,
          transcript: presentation.transcript,
          speakers: presentation.speakers,
          speakerStatistics: speakerStats,
          feedback: presentation.feedbacks,
          analysisResults: presentation.analysisResults,
        },
      };
    } catch (error) {
      console.error("Get analysis results error:", error);
      return {
        success: false,
        message: "Failed to get analysis results",
        error: error.message,
      };
    }
  }

  /**
   * Check if user has access to presentation
   * @param {number} presentationId
   * @param {number} userId
   * @param {string} userRole
   * @returns {Promise<boolean>}
   */
  async checkPresentationAccess(presentationId, userId, userRole = null) {
    try {
      const presentation = await Presentation.findByPk(presentationId);

      if (!presentation) {
        return false;
      }

      // Owner always has access
      if (presentation.studentId === userId) {
        return true;
      }

      // Admin/Teacher/Instructor can access all
      if (
        userRole &&
        ["admin", "teacher", "instructor"].includes(userRole.toLowerCase())
      ) {
        return true;
      }

      // ── Group member access ──
      // Nếu người dùng thuộc cùng nhóm với owner của presentation thì cho phép truy cập
      if (presentation.classId) {
        // Lấy group của owner trong class này
        const ownerGroup = await GroupStudent.findOne({
          where: { studentId: presentation.studentId },
          include: [{
            model: Group,
            as: "group",
            where: { classId: presentation.classId },
            attributes: ["groupId"],
          }],
        });

        if (ownerGroup) {
          // Kiểm tra userId có trong cùng group không
          const isMember = await GroupStudent.findOne({
            where: {
              studentId: userId,
              groupId: ownerGroup.group.groupId,
            },
          });
          if (isMember) return true;
        }
      }

      // Check if user is enrolled in same course (fallback)
      if (presentation.courseId) {
        const enrollment = await TopicEnrollment.findOne({
          where: {
            studentId: userId,
            status: "enrolled",
          },
          include: [
            {
              model: Topic,
              as: "topic",
              where: { courseId: presentation.courseId },
            },
          ],
        });

        if (enrollment) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Check access error:", error);
      return false;
    }
  }

  /**
   * Get presentations by course (for teachers)
   * @param {number} courseId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getPresentationsByCourse(courseId, options = {}) {
    try {
      const { status, limit = 50, offset = 0 } = options;

      const where = { courseId };
      if (status) {
        where.status = status;
      }

      const presentations = await Presentation.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "student",
            attributes: ["userId", "firstName", "lastName", "email"],
          },
          {
            model: Topic,
            as: "topic",
            attributes: ["topicId", "topicName"],
          },
        ],
      });

      return {
        success: true,
        presentations: presentations.rows,
        total: presentations.count,
        limit,
        offset,
      };
    } catch (error) {
      console.error("Get presentations by course error:", error);
      return {
        success: false,
        message: "Failed to get presentations",
        error: error.message,
      };
    }
  }

  /**
   * Get presentations for instructor (filtered by assigned classes)
   * @param {number} instructorId - Instructor user ID
   * @param {object} filters - Filter options (status, classId, courseId, search)
   * @param {object} pagination - Pagination options
   * @returns {Promise<object>} - Result with presentations
   */
  async getPresentationsByInstructor(
    instructorId,
    filters = {},
    pagination = {},
  ) {
    try {
      const { ClassInstructor } = db;

      // Step 1: Get instructor's assigned classes
      const instructorClasses = await ClassInstructor.findAll({
        where: { instructorId },
        attributes: ["classId"],
      });

      if (instructorClasses.length === 0) {
        return {
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(pagination.page || 1),
            limit: parseInt(pagination.limit || 20),
            totalPages: 0,
          },
        };
      }

      const classIds = instructorClasses.map((ci) => ci.classId);

      // Step 2: Build where clause
      const where = {
        classId: { [db.Sequelize.Op.in]: classIds },
      };

      // Apply filters
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.classId) {
        where.classId = parseInt(filters.classId);
      }
      if (filters.courseId) {
        where.courseId = parseInt(filters.courseId);
      }
      if (filters.search) {
        where[db.Sequelize.Op.or] = [
          { title: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
          { description: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        ];
      }

      // Pagination
      const page = parseInt(pagination.page || 1);
      const limit = parseInt(pagination.limit || 20);
      const offset = (page - 1) * limit;

      // Step 3: Query presentations
      const { count, rows: presentations } = await Presentation.findAndCountAll(
        {
          where,
          limit,
          offset,
          order: [
            ["submissionDate", "DESC"],
            ["createdAt", "DESC"],
          ],
          include: [
            {
              model: Class,
              as: "class",
              attributes: ["classId", "classCode"],
            },
            {
              model: Course,
              as: "course",
              attributes: ["courseId", "courseCode", "courseName"],
            },
            {
              model: Topic,
              as: "topic",
              attributes: ["topicId", "topicName", "sequenceNumber"],
            },
            {
              model: User,
              as: "student",
              attributes: [
                "userId",
                "username",
                "firstName",
                "lastName",
                "email",
              ],
            },
          ],
          distinct: true,
        },
      );

      return {
        success: true,
        data: presentations,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error("Get presentations by instructor error:", error);
      return {
        success: false,
        message: "Failed to get presentations for instructor",
        error: error.message,
      };
    }
  }

  /**
   * Get detailed analysis progress for presentation
   * @param {number} presentationId
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getAnalysisProgress(presentationId, userId) {
    try {
      // Check access
      const hasAccess = await this.checkPresentationAccess(
        presentationId,
        userId,
      );
      if (!hasAccess) {
        return { success: false, message: "Access denied" };
      }

      const progress = await jobService.getAnalysisProgress(presentationId);

      return {
        success: true,
        progress,
      };
    } catch (error) {
      console.error("Get analysis progress error:", error);
      return {
        success: false,
        message: "Failed to get analysis progress",
        error: error.message,
      };
    }
  }

  // Get AI feedback for a presentation
  async getAIFeedback(presentationId, userId) {
    try {
      // Check access
      const hasAccess = await this.checkPresentationAccess(
        presentationId,
        userId,
      );
      if (!hasAccess) {
        return { success: false, message: "Access denied" };
      }

      // Get AI feedback (feedbackType = 'general' from py-report-worker)
      const feedbacks = await Feedback.findAll({
        where: {
          presentationId: presentationId,
          feedbackType: "general",
        },
        order: [["createdAtFeedback", "DESC"]],
      });

      if (!feedbacks || feedbacks.length === 0) {
        return {
          success: true,
          message: "No AI feedback found for this presentation",
          feedback: null,
        };
      }

      // Return the most recent AI feedback
      const aiFeedback = feedbacks[0];

      return {
        success: true,
        feedback: {
          feedbackId: aiFeedback.feedbackId,
          presentationId: aiFeedback.presentationId,
          rating: aiFeedback.rating,
          comments: aiFeedback.comments,
          feedbackType: aiFeedback.feedbackType,
          isVisibleToStudent: aiFeedback.isVisibleToStudent,
          createdAtFeedback: aiFeedback.createdAtFeedback,
        },
      };
    } catch (error) {
      console.error("Get AI feedback error:", error);
      return {
        success: false,
        message: "Failed to get AI feedback",
        error: error.message,
      };
    }
  }
}

export default new PresentationService();
