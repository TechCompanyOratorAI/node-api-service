const { validationResult } = require("express-validator");
const criterionFeedbackService = require('../services/aiReportFeedbackService');

class CriterionFeedbackController {
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
      }

      const { reportId } = req.params;
      const instructorId = req.user?.userId;

      const result = await criterionFeedbackService.create(
        parseInt(reportId),
        req.body,
        instructorId
      );

      if (result.success) return res.status(201).json(result);
      return res.status(result.code === "NOT_FOUND" ? 404 : 400).json(result);
    } catch (error) {
      console.error("Create criterion feedback controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  async upsert(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
      }

      const { reportId, classRubricCriteriaId } = req.params;
      const instructorId = req.user?.userId;

      const result = await criterionFeedbackService.upsert(
        parseInt(reportId),
        parseInt(classRubricCriteriaId),
        req.body,
        instructorId
      );

      if (result.success) return res.status(200).json(result);
      return res.status(result.code === "NOT_FOUND" ? 404 : 400).json(result);
    } catch (error) {
      console.error("Upsert criterion feedback controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  async delete(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
      }

      const { reportId, classRubricCriteriaId } = req.params;

      const result = await criterionFeedbackService.delete(parseInt(reportId), parseInt(classRubricCriteriaId));

      if (result.success) return res.status(200).json(result);
      return res.status(result.code === "NOT_FOUND" ? 404 : 400).json(result);
    } catch (error) {
      console.error("Delete criterion feedback controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  async getByReportId(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
      }

      const { reportId } = req.params;

      const result = await criterionFeedbackService.getByReportId(parseInt(reportId));

      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (error) {
      console.error("Get criterion feedbacks controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }
}

module.exports = new CriterionFeedbackController();
