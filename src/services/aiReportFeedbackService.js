const { Feedback, AIReport, User } = require("../models");

const AI_REPORT_INSTRUCTOR = "ai_report_instructor";

class AIReportFeedbackService {
  async createOrUpdateFeedback(reportId, data, instructorId) {
    try {
      const report = await AIReport.findByPk(reportId);
      if (!report) {
        return {
          success: false,
          message: "AI report không tìm thấy",
          code: "NOT_FOUND",
        };
      }

      const comments =
        data.feedbackContent !== undefined
          ? data.feedbackContent
          : data.comments !== undefined
            ? data.comments
            : null;

      const payload = {
        presentationId: report.presentationId,
        reviewerId: instructorId,
        reportId,
        feedbackType: AI_REPORT_INSTRUCTOR,
        comments,
        criterionFeedbacks: data.criterionFeedbacks ?? null,
        rating: data.rating !== undefined && data.rating !== null ? data.rating : null,
        isVisibleToStudent: data.isVisibleToStudent ?? true,
      };

      let row = await Feedback.findOne({
        where: { reportId, feedbackType: AI_REPORT_INSTRUCTOR },
      });

      if (row) {
        await row.update(payload);
        return {
          success: true,
          data: row,
          message: "Đã cập nhật feedback",
        };
      }

      row = await Feedback.create(payload);
      return {
        success: true,
        data: row,
        message: "Đã tạo feedback",
      };
    } catch (error) {
      console.error("Create/update feedback error:", error);
      return {
        success: false,
        message: "Lỗi khi tạo/cập nhật feedback",
        error: error.message,
      };
    }
  }

  async getFeedbackByReportId(reportId) {
    try {
      const feedback = await Feedback.findOne({
        where: { reportId, feedbackType: AI_REPORT_INSTRUCTOR },
        include: [
          {
            model: User,
            as: "reviewer",
            attributes: ["userId", "firstName", "lastName", "email"],
          },
        ],
      });

      if (!feedback) {
        return {
          success: false,
          message: "Feedback không tìm thấy",
          code: "NOT_FOUND",
        };
      }

      return {
        success: true,
        data: feedback,
      };
    } catch (error) {
      console.error("Get feedback error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy feedback",
        error: error.message,
      };
    }
  }

  async deleteFeedback(reportId) {
    try {
      const feedback = await Feedback.findOne({
        where: { reportId, feedbackType: AI_REPORT_INSTRUCTOR },
      });

      if (!feedback) {
        return {
          success: false,
          message: "Feedback không tìm thấy",
          code: "NOT_FOUND",
        };
      }

      await feedback.destroy();

      return {
        success: true,
        message: "Đã xóa feedback",
      };
    } catch (error) {
      console.error("Delete feedback error:", error);
      return {
        success: false,
        message: "Lỗi khi xóa feedback",
        error: error.message,
      };
    }
  }

  async toggleVisibility(reportId) {
    try {
      const feedback = await Feedback.findOne({
        where: { reportId, feedbackType: AI_REPORT_INSTRUCTOR },
      });

      if (!feedback) {
        return {
          success: false,
          message: "Feedback không tìm thấy",
          code: "NOT_FOUND",
        };
      }

      const next = !feedback.isVisibleToStudent;
      await feedback.update({ isVisibleToStudent: next });
      await feedback.reload();

      return {
        success: true,
        data: feedback,
        message: feedback.isVisibleToStudent
          ? "Đã hiển thị cho sinh viên"
          : "Đã ẩn khỏi sinh viên",
      };
    } catch (error) {
      console.error("Toggle visibility error:", error);
      return {
        success: false,
        message: "Lỗi khi thay đổi visibility",
        error: error.message,
      };
    }
  }
}

module.exports = new AIReportFeedbackService();
