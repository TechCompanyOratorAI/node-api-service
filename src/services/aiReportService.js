const { 
  AIReport, 
  ClassAISetting, 
  ClassRubricCriteria, 
  Presentation, 
  Class, 
  RubricTemplate,
  User 
} = require("../models");
const { Op } = require("sequelize");
const db = require("../models");

class AIReportService {
  /**
   * Generate AI report for a submission
   */
  async generateReport(submissionId, classId, userId) {
    try {
      // Check submission exists
      const submission = await Presentation.findByPk(submissionId);
      if (!submission) {
        return {
          success: false,
          message: "Bài nộp không tìm thấy",
        };
      }

      // Get active AI settings for the class
      const aiSettings = await ClassAISetting.findOne({
        where: {
          classId: classId,
          isActive: true,
        },
        include: [
          { model: RubricTemplate, as: "rubricTemplate", attributes: ["rubricTemplateId", "templateName"] },
        ],
      });

      if (!aiSettings) {
        return {
          success: false,
          message: "Cài đặt AI cho lớp không tìm thấy",
        };
      }

      // Check if AI report is enabled
      if (!aiSettings.enableAiReport) {
        return {
          success: false,
          message: "AI report đã bị tắt cho lớp này",
          code: "AI_REPORT_DISABLED",
        };
      }

      // Get class rubric criteria (the actual rubric used for evaluation)
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

      // Check if there's already a report for this submission
      const existingReport = await AIReport.findOne({
        where: { submissionId: submissionId },
      });

      // Determine initial status based on requireInstructorConfirmation
      const initialStatus = aiSettings.requireInstructorConfirmation 
        ? "pending_review" 
        : "confirmed";

      // Prepare class rubric data to pass to AI pipeline
      const rubricData = classCriteria.map((c) => ({
        criteriaId: c.classRubricCriteriaId,
        criteriaName: c.criteriaName,
        criteriaDescription: c.criteriaDescription,
        weight: parseFloat(c.weight),
        maxScore: parseFloat(c.maxScore),
        evaluationGuide: c.evaluationGuide,
      }));

      // ============================================================
      // NOTE: This is where you would call the existing AI pipeline
      // The actual AI processing is handled by BE (Python worker)
      // Here we just prepare the data and create initial record
      // ============================================================
      
      // For now, create a placeholder record
      // In production, you would:
      // 1. Send rubricData + submission to AI pipeline
      // 2. Receive generated report and scores
      // 3. Update the record with results
      
      const reportData = {
        submissionId: submissionId,
        classId: classId,
        configId: aiSettings.configId,
        rubricTemplateId: aiSettings.rubricTemplateId,
        classAiSettingId: aiSettings.classAiSettingId,
        reportStatus: "generating",
      };

      let report;
      if (existingReport) {
        await existingReport.update(reportData);
        report = existingReport;
      } else {
        report = await AIReport.create(reportData);
      }

      // ============================================================
      // TODO: Trigger Python AI worker here
      // Example: await queueService.addJob('generate-ai-report', { 
      //   reportId: report.reportId,
      //   submissionId: submissionId,
      //   rubricData: rubricData,
      //   settings: {
      //     feedbackLanguage: aiSettings.feedbackLanguage,
      //     reportFormat: aiSettings.reportFormat,
      //     includeCriterionComments: aiSettings.includeCriterionComments,
      //     includeOverallSummary: aiSettings.includeOverallSummary,
      //     includeSuggestions: aiSettings.includeSuggestions,
      //     enableSlideLayoutScoring: aiSettings.enableSlideLayoutScoring,
      //     slideLayoutWeight: aiSettings.slideLayoutWeight,
      //   }
      // });
      // ============================================================

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

  /**
   * Get report detail by ID
   */
  async getReportById(reportId) {
    try {
      const report = await AIReport.findByPk(reportId, {
        include: [
          { model: Presentation, as: "submission", attributes: ["presentationId", "title", "status"] },
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
          { model: RubricTemplate, as: "rubricTemplate", attributes: ["rubricTemplateId", "templateName"] },
          { model: User, as: "confirmer", attributes: ["userId", "firstName", "lastName", "email"] },
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

  /**
   * Get all reports of a class
   */
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

  /**
   * Confirm AI report (instructor confirms the report)
   */
  async confirmReport(reportId, instructorId) {
    try {
      const report = await AIReport.findByPk(reportId);

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
        };
      }

      // Check if report is in a confirmable state
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
      });

      return {
        success: true,
        data: report,
        message: "Đã xác nhận AI report",
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

  /**
   * Edit AI report (instructor edits content and/or scores)
   */
  async editReport(reportId, data, instructorId) {
    try {
      const report = await AIReport.findByPk(reportId);

      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
        };
      }

      // Get AI settings to check if editing is allowed
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

      // Allow editing if status is confirmed or pending_review
      if (!["pending_review", "confirmed", "completed", "draft"].includes(report.reportStatus)) {
        return {
          success: false,
          message: "Report không ở trạng thái có thể chỉnh sửa",
          code: "INVALID_STATUS",
        };
      }

      // Update fields
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

  /**
   * Reject AI report
   */
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
}

module.exports = new AIReportService();