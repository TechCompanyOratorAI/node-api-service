/**
 * ⚠️  DEV BYPASS SERVICE — FOR TESTING ONLY ⚠️
 *
 * Cho phép upload slide + media và trigger full pipeline
 * mà không cần authentication, enrollment, hoặc status check.
 *
 * KHÔNG dùng trong production.
 */

import crypto from "crypto";
import path from "path";
import db from "../models/index.js";
import storageService from "./storageService.js";
import jobService from "./jobService.js";

const {
  Presentation,
  Slide,
  AudioRecord,
  Transcript,
  TranscriptSegment,
  Job,
  Feedback,
  AnalysisResult,
  SegmentAnalysis,
} = db;

const sanitizeFileName = (filename) => {
  const baseName = path.basename(filename || "file");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

class DevBypassService {
  /**
   * Lấy bất kỳ presentation nào tồn tại trong DB (không cần ownership)
   */
  async getAnyPresentation(presentationId) {
    const presentation = await Presentation.findByPk(presentationId);
    if (!presentation) {
      return { success: false, message: `Presentation ${presentationId} không tìm thấy` };
    }
    return { success: true, presentation };
  }

  /**
   * Upload slide vào presentation chỉ định (bypass auth + enrollment)
   */
  async uploadSlide({ presentationId, slideNumber, file }) {
    const transaction = await db.sequelize.transaction();
    try {
      const found = await this.getAnyPresentation(presentationId);
      if (!found.success) {
        await transaction.rollback();
        return found;
      }

      const presentation = found.presentation;

      // Xóa slide cũ trong storage
      const existingSlides = await Slide.findAll({ where: { presentationId }, transaction });
      for (const oldSlide of existingSlides) {
        try {
          if (oldSlide.filePath) {
            const url = new URL(oldSlide.filePath);
            const key = url.pathname.substring(1);
            await storageService.deleteFile(key);
          }
        } catch (e) {
          console.warn(`⚠️ [DevBypass] Could not delete old slide file: ${e.message}`);
        }
      }

      // Xóa phân tích cũ liên quan
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
      await AnalysisResult.destroy({ where: { presentationId }, transaction });
      await Feedback.destroy({ where: { presentationId }, transaction });
      await Slide.destroy({ where: { presentationId }, transaction });

      const finalSlideNumber = slideNumber || 1;
      const extension = path.extname(file.originalname || "");
      const uniqueSuffix = crypto.randomBytes(6).toString("hex");
      const safeName = sanitizeFileName(file.originalname || `slide-${finalSlideNumber}${extension}`);
      const key = `presentations/${presentationId}/slides/${finalSlideNumber}-${uniqueSuffix}-${safeName}`;

      const uploadResult = await storageService.uploadBuffer({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });

      const slide = await Slide.create(
        {
          presentationId,
          slideNumber: finalSlideNumber,
          filePath: uploadResult.url,
          fileName: file.originalname,
          fileFormat: file.mimetype,
          fileSizeBytes: file.size,
          uploadedAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      console.log(`✅ [DevBypass] Slide uploaded for presentation ${presentationId}`);
      return { success: true, slide };
    } catch (error) {
      await transaction.rollback();
      console.error("[DevBypass] uploadSlide error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  /**
   * Upload media vào presentation chỉ định (bypass auth + enrollment)
   */
  async uploadMedia({ presentationId, file, durationSeconds, sampleRate, recordingMethod }) {
    try {
      const found = await this.getAnyPresentation(presentationId);
      if (!found.success) return found;

      const extension = path.extname(file.originalname || "");
      const uniqueSuffix = crypto.randomBytes(6).toString("hex");
      const safeName = sanitizeFileName(file.originalname || `media${extension}`);
      const key = `presentations/${presentationId}/media/${Date.now()}-${uniqueSuffix}-${safeName}`;

      const uploadResult = await storageService.uploadBuffer({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });

      const payload = {
        presentationId,
        filePath: uploadResult.url,
        fileName: file.originalname,
        fileFormat: file.mimetype,
        fileSizeBytes: file.size,
        durationSeconds: durationSeconds || null,
        sampleRate: sampleRate || null,
        recordingMethod: recordingMethod || "upload",
        uploadedAt: new Date(),
      };

      const existing = await AudioRecord.findOne({ where: { presentationId } });
      let audioRecord;
      if (existing) {
        await AudioRecord.update(payload, { where: { presentationId } });
        audioRecord = await AudioRecord.findOne({ where: { presentationId } });
      } else {
        audioRecord = await AudioRecord.create(payload);
      }

      if (durationSeconds) {
        await Presentation.update({ durationSeconds }, { where: { presentationId } });
      }

      console.log(`✅ [DevBypass] Media uploaded for presentation ${presentationId}`);
      return { success: true, audioRecord };
    } catch (error) {
      console.error("[DevBypass] uploadMedia error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  /**
   * Trigger full pipeline (slide OCR + ASR) cho presentation chỉ định.
   * Bypass mọi status check, auth, và enrollment.
   */
  async triggerFullPipeline(presentationId) {
    try {
      const found = await this.getAnyPresentation(presentationId);
      if (!found.success) return found;

      const presentation = found.presentation;

      // Validate có audio không
      const audioRecord = await AudioRecord.findOne({ where: { presentationId } });
      if (!audioRecord) {
        return {
          success: false,
          message: "Bài thuyết trình chưa có bản ghi âm",
        };
      }

      // ── Cleanup stale jobs + old analysis data ──────────────────────────────
      await Job.destroy({ where: { presentationId } });
      console.log(`🧹 [DevBypass] Cleared old jobs for presentation ${presentationId}`);

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
                `(SELECT segmentId FROM TranscriptSegments WHERE transcriptId IN (${transcriptIds.join(",")}))`
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
      // ────────────────────────────────────────────────────────────────────────

      // Update status → processing
      await Presentation.update(
        { status: "processing", submittedAt: new Date() },
        { where: { presentationId } }
      );

      // Tạo slide jobs
      const slides = await Slide.findAll({ where: { presentationId } });
      const slideJobs = [];
      for (const slide of slides) {
        try {
          const sj = await jobService.createJob(presentationId, "slides", {
            slideId: slide.slideId,
            slideUrl: slide.filePath,
            slideNumber: slide.slideNumber,
            fileName: slide.fileName,
            fileFormat: slide.fileFormat,
            triggeredBy: "dev-bypass",
          });
          slideJobs.push(sj);
          console.log(`📤 [DevBypass] Slide OCR job created for slide ${slide.slideId}`);
        } catch (e) {
          console.error(`⚠️ [DevBypass] Failed để tạo slide job: ${e.message}`);
        }
      }

      // Tạo ASR job
      const asrJob = await jobService.createJob(presentationId, "asr", {
        submittedBy: "dev-bypass",
        submittedAt: new Date().toISOString(),
        bypass: true,
      });

      console.log(`🚀 [DevBypass] ASR job ${asrJob.jobId} created for presentation ${presentationId}`);

      return {
        success: true,
        message: "Đã tạo lại các job xử lý cho bài thuyết trình",
        presentationId,
        asrJob,
        slideJobs,
        slideCount: slides.length,
      };
    } catch (error) {
      console.error("[DevBypass] triggerFullPipeline error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  /**
   * Lấy danh sách presentations (để caller chọn cái nào xài)
   */
  async listPresentations(limit = 20) {
    try {
      const presentations = await Presentation.findAll({
        order: [["createdAt", "DESC"]],
        limit,
        attributes: ["presentationId", "title", "status", "studentId", "createdAt"],
      });
      return { success: true, presentations };
    } catch (error) {
      console.error("[DevBypass] listPresentations error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }
}

export default new DevBypassService();
