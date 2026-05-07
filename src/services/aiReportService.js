import {
  AIReport,
  Feedback,
  CriterionFeedback,
  ClassAISetting,
  ClassRubricCriteria,
  Presentation,
  Class,
  User,
} from "../models";
import { Op } from "sequelize";
import db from "../models";
import queueService from "../services/queueService";
import jobService from "./jobService.js";
import { emitReportEvent } from "../websocket/emitters.js";

const VALID_REPORT_STATUSES = [
  "waiting",
  "draft",
  "pending_review",
  "generating",
  "completed",
  "failed",
  "confirmed",
  "rejected",
];

class AIReportService {
  async generateReport(presentationId, classId, userId) {
    try {
      const submission = await Presentation.findByPk(presentationId);
      if (!submission) {
        return {
          success: false,
          message: "Bài nộp không tìm thấy",
        };
      }

      const aiSettings = await ClassAISetting.findOne({
        where: {
          classId: classId,
          isActive: true,
        },
      });

      if (!aiSettings) {
        return {
          success: false,
          message: "Cài đặt AI cho lớp không tìm thấy",
        };
      }
      if (!aiSettings.enableAiReport) {
        return {
          success: false,
          message: "AI report đã bị tắt cho lớp này",
          code: "AI_REPORT_DISABLED",
        };
      }
      const classCriteria = await ClassRubricCriteria.findAll({
        where: {
          classId: classId,
          isActive: 1,
        },
        order: [["displayOrder", "ASC"]],
      });

      if (classCriteria.length === 0) {
        return {
          success: false,
          message: "Lớp học chưa có rubric criteria. Vui lòng copy từ template hoặc thêm criteria thủ công.",
          code: "EMPTY_CLASS_RUBRIC",
        };
      }

      const totalWeight = classCriteria.reduce((sum, c) => sum + parseFloat(c.weight || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        return {
          success: false,
          message: `Tổng trọng số của các criteria phải bằng 100%. Hiện tại là ${totalWeight.toFixed(2)}%.`,
          code: "INVALID_CRITERIA_WEIGHT",
        };
      }

      const existingReport = await AIReport.findOne({
        where: { presentationId: presentationId },
      });

      const initialStatus = aiSettings.requireInstructorConfirmation
        ? "pending_review"
        : "confirmed";

      const rubricData = classCriteria.map((c) => ({
        criteriaId: c.classRubricCriteriaId,
        criteriaName: c.criteriaName,
        criteriaDescription: c.criteriaDescription,
        weight: parseFloat(c.weight),
        maxScore: parseFloat(c.maxScore),
        evaluationGuide: c.evaluationGuide,
      }));

      const reportData = {
        presentationId: presentationId,
        classId: classId,
        classAiSettingId: aiSettings.classAiSettingId,
        reportStatus: "waiting",
      };

      let report;
      if (existingReport) {
        await existingReport.update(reportData);
        report = existingReport;
      } else {
        report = await AIReport.create(reportData);
      }


      return {
        success: true,
        data: {
          reportId: report.reportId,
          status: report.reportStatus,
          rubricCriteria: rubricData,
        },
        message: "Đã bắt đầu tạo AI report",
      };
    } catch (error) {
      console.error("Generate AI report error:", error);
      return {
        success: false,
        message: "Lỗi khi tạo AI report",
        error: error.message,
      };
    }
  }

  async triggerReportAfterAnalysis(presentationId, jobId) {
    try {
      const presentation = await Presentation.findByPk(presentationId, {
        attributes: ["presentationId", "classId", "title", "status"],
      });

      if (!presentation) {
        return {
          success: false,
          message: "Không tìm thấy bài thuyết trình",
        };
      }

      const classId = presentation.classId;

      if (!classId) {
        return {
          success: false,
          message: "Presentation không thuộc lớp nào",
        };
      }

      const aiSettings = await ClassAISetting.findOne({
        where: {
          classId: classId,
          isActive: true,
        },
      });

      if (!aiSettings || !aiSettings.enableAiReport) {
        console.log(`[AIReportService] AI report is disabled for class ${classId}, skipping report generation`);
        return {
          success: true,
          skipped: true,
          message: "AI report không được bật cho lớp này",
        };
      }

      const classCriteria = await ClassRubricCriteria.findAll({
        where: {
          classId: classId,
          isActive: 1,
        },
        order: [["displayOrder", "ASC"]],
      });

      if (classCriteria.length === 0) {
        console.log(`[AIReportService] Class ${classId} has no rubric criteria, skipping report generation`);
        return {
          success: true,
          skipped: true,
          message: "Lớp chưa có rubric criteria",
        };
      }

      const totalWeight = classCriteria.reduce((sum, c) => sum + parseFloat(c.weight || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        console.log(`[AIReportService] Class ${classId} criteria weight sum is ${totalWeight.toFixed(2)}%, skipping report generation`);
        return {
          success: true,
          skipped: true,
          message: `Tổng trọng số criteria phải bằng 100%. Hiện tại là ${totalWeight.toFixed(2)}%.`,
        };
      }

      const existingReport = await AIReport.findOne({
        where: { presentationId: presentationId },
      });

      if (existingReport) {
        await existingReport.update({
          reportStatus: "generating",
          classAiSettingId: aiSettings.classAiSettingId,
        });

        console.log(`[AIReportService] Triggering report regeneration for presentation ${presentationId}`);

        // Create a new dedicated report job
        const reportJob = await jobService.createJob(presentationId, "report", {
          reportId: existingReport.reportId,
          triggeredBy: jobId,
        });

        await this._sendToReportQueue(presentationId, existingReport.reportId, classId, reportJob.jobId, classCriteria, aiSettings);

        return {
          success: true,
          reportId: existingReport.reportId,
          message: "Đã kích hoạt tạo lại AI report",
        };
      }
      const rubricData = classCriteria.map((c) => ({
        criteriaId: c.classRubricCriteriaId,
        criteriaName: c.criteriaName,
        criteriaDescription: c.criteriaDescription,
        weight: parseFloat(c.weight),
        maxScore: parseFloat(c.maxScore),
        evaluationGuide: c.evaluationGuide,
      }));

      const report = await AIReport.create({
        presentationId: presentationId,
        classId: classId,
        classAiSettingId: aiSettings.classAiSettingId,
        reportStatus: "waiting",
      });

      console.log(`[AIReportService] Created report ${report.reportId} for presentation ${presentationId}`);
      await report.update({ reportStatus: "generating" });

      // Create a new dedicated report job
      const reportJob = await jobService.createJob(presentationId, "report", {
        reportId: report.reportId,
        triggeredBy: jobId,
      });

      await this._sendToReportQueue(presentationId, report.reportId, classId, reportJob.jobId, classCriteria, aiSettings);

      return {
        success: true,
        reportId: report.reportId,
        message: "Đã kích hoạt tạo AI report",
      };
    } catch (error) {
      console.error("Trigger report after analysis error:", error);
      return {
        success: false,
        message: "Lỗi khi kích hoạt report",
        error: error.message,
      };
    }
  }

  async _sendToReportQueue(presentationId, reportId, classId, jobId, classCriteria, aiSettings) {
    try {
      const rubricData = classCriteria.map((c) => ({
        criteriaId: c.classRubricCriteriaId,
        criteriaName: c.criteriaName,
        criteriaDescription: c.criteriaDescription,
        weight: parseFloat(c.weight),
        maxScore: parseFloat(c.maxScore),
        evaluationGuide: c.evaluationGuide,
      }));

      const queueMessage = {
        presentationId: presentationId,
        reportId: reportId,
        classId: classId,
        jobId: jobId,
        rubricData: rubricData,
        settings: {
          feedbackLanguage: aiSettings.feedbackLanguage || "en",
          reportFormat: aiSettings.reportFormat || "detailed",
          includeCriterionComments: aiSettings.includeCriterionComments ?? true,
          includeOverallSummary: aiSettings.includeOverallSummary ?? true,
          includeSuggestions: aiSettings.includeSuggestions ?? true,
        },
      };
      const result = await queueService.sendToReportQueue(queueMessage);

      console.log(`[AIReportService] Sent job to Report Queue:`, {
        reportId,
        presentationId,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      console.error("[AIReportService] Failed to send to Report Queue:", error);
      return { success: false, error: error.message };
    }
  }


  async getReportById(reportId) {
    try {
      const report = await AIReport.findByPk(reportId, {
        include: [
          { model: Presentation, as: "submission", attributes: ["presentationId", "title", "status"] },
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
          { model: User, as: "confirmer", attributes: ["userId", "firstName", "lastName", "email"] },
          {
            model: Feedback,
            as: "instructorFeedback",
            required: false,
            include: [
              { model: User, as: "reviewer", attributes: ["userId", "firstName", "lastName", "email"] },
            ],
          },
        ],
      });

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
        };
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      console.error("Get AI report error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy AI report",
        error: error.message,
      };
    }
  }


  async getReportsByClass(classId, options = {}) {
    try {
      const { page = 1, limit = 20, status } = options;

      const where = { classId: classId };
      if (status) {
        where.reportStatus = status;
      }

      const { count, rows: reports } = await AIReport.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [["createdAt", "DESC"]],
        include: [
          { model: Presentation, as: "submission", attributes: ["presentationId", "title", "status"] },
          { model: User, as: "confirmer", attributes: ["userId", "firstName", "lastName"] },
        ],
      });

      return {
        success: true,
        data: {
          reports,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      console.error("Get AI reports by class error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách AI reports",
        error: error.message,
      };
    }
  }

  async confirmReport(reportId, instructorId, feedbackOfInstructor, gradeForInstructor) {
    try {
      const report = await AIReport.findByPk(reportId);

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
        };
      }
      if (!["pending_review", "completed", "draft"].includes(report.reportStatus)) {
        return {
          success: false,
          message: "Report không ở trạng thái có thể xác nhận",
          code: "INVALID_STATUS",
        };
      }

      await report.update({
        reportStatus: "confirmed",
        confirmedByInstructorId: instructorId,
        confirmedAt: new Date(),
        feedbackOfInstructor: feedbackOfInstructor,
        gradeForInstructor: gradeForInstructor,
      });

      // Emit WebSocket: report confirmed by instructor
      emitReportEvent("confirmed", report.presentationId, {
        reportId,
        instructorId,
        overallScore: report.overallScore,
        message: "Giảng viên đã xác nhận báo cáo",
      });

      // Không sync điểm vào Enrollment ở đây nữa
      // Leader sẽ là người chia điểm cho các thành viên nhóm sau khi confirm
      // thông qua API: POST /api/ai-reports/:reportId/distribute-grade

      return {
        success: true,
        data: report,
        message: "Đã xác nhận AI report. Trưởng nhóm sẽ phân chia điểm cho các thành viên.",
      };
    } catch (error) {
      console.error("Confirm AI report error:", error);
      return {
        success: false,
        message: "Lỗi khi xác nhận AI report",
        error: error.message,
      };
    }
  }

  async editReport(reportId, data, instructorId) {
    try {
      const report = await AIReport.findByPk(reportId);

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
        };
      }

      const aiSettings = await ClassAISetting.findOne({
        where: {
          classId: report.classId,
          isActive: true,
        },
      });

      if (!aiSettings || !aiSettings.allowInstructorEdit) {
        return {
          success: false,
          message: "Giảng viên không được phép chỉnh sửa AI report",
          code: "EDIT_NOT_ALLOWED",
        };
      }

      if (!["pending_review", "confirmed", "completed", "draft"].includes(report.reportStatus)) {
        return {
          success: false,
          message: "Report không ở trạng thái có thể chỉnh sửa",
          code: "INVALID_STATUS",
        };
      }
      const updateData = {};
      if (data.overallScore !== undefined) {
        updateData.overallScore = data.overallScore;
      }
      if (data.criterionScores !== undefined) {
        updateData.criterionScores = data.criterionScores;
      }
      if (data.reportContent !== undefined) {
        updateData.reportContent = data.reportContent;
      }
      if (data.reportStatus !== undefined) {
        updateData.reportStatus = data.reportStatus;
      }

      await report.update(updateData);

      return {
        success: true,
        data: report,
        message: "Đã cập nhật AI report",
      };
    } catch (error) {
      console.error("Edit AI report error:", error);
      return {
        success: false,
        message: "Lỗi khi chỉnh sửa AI report",
        error: error.message,
      };
    }
  }


  async rejectReport(reportId, instructorId) {
    try {
      const report = await AIReport.findByPk(reportId);

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
        };
      }

      if (!["pending_review", "confirmed", "completed"].includes(report.reportStatus)) {
        return {
          success: false,
          message: "Report không ở trạng thái có thể từ chối",
          code: "INVALID_STATUS",
        };
      }

      await report.update({
        reportStatus: "rejected",
        confirmedByInstructorId: instructorId,
        confirmedAt: new Date(),
      });

      // Emit WebSocket: report rejected by instructor
      emitReportEvent("rejected", report.presentationId, {
        reportId,
        instructorId,
        message: "Giảng viên đã từ chối báo cáo",
      });

      return {
        success: true,
        data: report,
        message: "Đã từ chối AI report",
      };
    } catch (error) {
      console.error("Reject AI report error:", error);
      return {
        success: false,
        message: "Lỗi khi từ chối AI report",
        error: error.message,
      };
    }
  }

  async updateReportStatus(reportId, reportStatus) {
    try {
      if (!VALID_REPORT_STATUSES.includes(reportStatus)) {
        return {
          success: false,
          message: "Trạng thái không hợp lệ",
          code: "INVALID_STATUS",
        };
      }

      const report = await AIReport.findByPk(reportId);

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
          code: "NOT_FOUND",
        };
      }

      await report.update({ reportStatus });

      return {
        success: true,
        data: report,
        message: "Đã cập nhật trạng thái report",
      };
    } catch (error) {
      console.error("Update report status error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật trạng thái report",
        error: error.message,
      };
    }
  }

  async getReportBySubmission(presentationId) {
    try {
      const report = await AIReport.findOne({
        where: { presentationId: presentationId },
        include: [
          { model: Presentation, as: "submission", attributes: ["presentationId", "title", "status"] },
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
          { model: User, as: "confirmer", attributes: ["userId", "firstName", "lastName", "email"] },
          {
            model: Feedback,
            as: "instructorFeedback",
            required: false,
            include: [
              { model: User, as: "reviewer", attributes: ["userId", "firstName", "lastName", "email"] },
            ],
          },
          {
            model: CriterionFeedback,
            as: "criterionFeedbacks",
            required: false,
            include: [
              { model: User, as: "instructor", attributes: ["userId", "firstName", "lastName", "email"] },
            ],
          },
        ],
      });

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy cho bài nộp này",
          code: "NOT_FOUND",
        };
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      console.error("Get AI report by submission error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy AI report theo submission",
        error: error.message,
      };
    }
  }

  async getReportDocumentByPresentation(presentationId) {
    try {
      const report = await AIReport.findOne({
        where: { presentationId: presentationId },
        attributes: ["reportId", "presentationId", "reportContent", "reportStatus", "updatedAt"],
        include: [
          { model: Presentation, as: "submission", attributes: ["presentationId", "title"] },
        ],
      });

      if (!report) {
        return {
          success: false,
          message: "AI report khÃ´ng tÃ¬m tháº¥y cho bÃ i thuyáº¿t trÃ¬nh nÃ y",
          code: "NOT_FOUND",
        };
      }

      if (!report.reportContent || !String(report.reportContent).trim()) {
        return {
          success: false,
          message: "AI report chÆ°a cÃ³ ná»™i dung Ä‘á»ƒ táº£i xuá»‘ng",
          code: "EMPTY_REPORT_CONTENT",
        };
      }

      return {
        success: true,
        data: {
          reportId: report.reportId,
          presentationId: report.presentationId,
          title: report.submission?.title || `presentation-${presentationId}`,
          reportContent: report.reportContent,
          reportStatus: report.reportStatus,
          updatedAt: report.updatedAt,
        },
      };
    } catch (error) {
      console.error("Get AI report document error:", error);
      return {
        success: false,
        message: "Lá»—i khi táº£i file AI report",
        error: error.message,
      };
    }
  }

  /**
   * Delete AI report by ID
   * @param {number} reportId - AI Report ID
   * @returns {Promise<Object>} - Result of deletion
   */
  async deleteReport(reportId) {
    try {
      const report = await AIReport.findByPk(reportId);

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
          code: "NOT_FOUND",
        };
      }

      if (!["waiting", "draft", "rejected", "failed"].includes(report.reportStatus)) {
        return {
          success: false,
          message: `Không thể xóa report ở trạng thái hiện tại: ${report.reportStatus}`,
          code: "INVALID_STATUS",
        };
      }

      await report.destroy();

      return {
        success: true,
        message: "Đã xóa AI report",
      };
    } catch (error) {
      console.error("Delete AI report error:", error);
      return {
        success: false,
        message: "Lỗi khi xóa AI report",
        error: error.message,
      };
    }
  }

  async getAllReports(options = {}) {
    try {
      const { page = 1, limit = 20, classId, status } = options;

      const where = {};
      if (classId) {
        where.classId = classId;
      }
      if (status) {
        where.reportStatus = status;
      }

      const { count, rows: reports } = await AIReport.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [["createdAt", "DESC"]],
        include: [
          { model: Presentation, as: "submission", attributes: ["presentationId", "title", "status"] },
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
          { model: User, as: "confirmer", attributes: ["userId", "firstName", "lastName"] },
        ],
      });

      return {
        success: true,
        data: {
          reports,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      console.error("Get all AI reports error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách AI reports",
        error: error.message,
      };
    }
  }
}

export default new AIReportService();
