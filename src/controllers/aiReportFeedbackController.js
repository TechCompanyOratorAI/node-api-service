const aiReportFeedbackService = require('../services/aiReportFeedbackService');

class AIReportFeedbackController {
  /**
   * POST /ai-reports/:reportId/feedback
   * Tạo hoặc cập nhật instructor feedback cho AI report
   */
  async createOrUpdateFeedback(req, res) {
    try {
      const { reportId } = req.params;
      const instructorId = req.user?.userId;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await aiReportFeedbackService.createOrUpdateFeedback(
        parseInt(reportId),
        req.body,
        instructorId
      );

      if (result.success) {
        return res.status(201).json(result);
      } else if (result.code === "NOT_FOUND") {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Create/update feedback controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /ai-reports/:reportId/feedback
   * Lấy feedback của một AI report
   */
  async getFeedbackByReportId(req, res) {
    try {
      const { reportId } = req.params;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await aiReportFeedbackService.getFeedbackByReportId(parseInt(reportId));

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_FOUND") {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get feedback controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * DELETE /ai-reports/:reportId/feedback
   * Xóa feedback của một AI report
   */
  async deleteFeedback(req, res) {
    try {
      const { reportId } = req.params;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await aiReportFeedbackService.deleteFeedback(parseInt(reportId));

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_FOUND") {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Delete feedback controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PATCH /ai-reports/:reportId/feedback/visibility
   * Toggle visibility của feedback cho student
   */
  async toggleVisibility(req, res) {
    try {
      const { reportId } = req.params;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await aiReportFeedbackService.toggleVisibility(parseInt(reportId));

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_FOUND") {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Toggle visibility controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

module.exports = new AIReportFeedbackController();
