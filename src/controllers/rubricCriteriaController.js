const { validationResult } = require("express-validator");
const rubricCriteriaService = require("../services/rubricCriteriaService");

class RubricCriteriaController {
  /**
   * POST /rubric-templates/:templateId/criteria
   * Add a criterion to a rubric template
   */
  async createCriteria(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { templateId } = req.params;

      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json({
          success: false,
          message: "ID template không hợp lệ",
        });
      }

      const result = await rubricCriteriaService.createCriteria(
        parseInt(templateId),
        req.body
      );

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Create rubric criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /rubric-templates/:templateId/criteria
   * Get all active criteria of a template
   */
  async getCriteriaByTemplate(req, res) {
    try {
      const { templateId } = req.params;

      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json({
          success: false,
          message: "ID template không hợp lệ",
        });
      }

      const result = await rubricCriteriaService.getCriteriaByTemplate(
        parseInt(templateId)
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get rubric criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PUT /rubric-criteria/:criteriaId
   * Update a rubric criterion
   */
  async updateCriteria(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { criteriaId } = req.params;

      if (!criteriaId || isNaN(parseInt(criteriaId))) {
        return res.status(400).json({
          success: false,
          message: "ID criteria không hợp lệ",
        });
      }

      const result = await rubricCriteriaService.updateCriteria(
        parseInt(criteriaId),
        req.body
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Update rubric criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * DELETE /rubric-criteria/:criteriaId
   * Soft delete a rubric criterion
   */
  async deleteCriteria(req, res) {
    try {
      const { criteriaId } = req.params;

      if (!criteriaId || isNaN(parseInt(criteriaId))) {
        return res.status(400).json({
          success: false,
          message: "ID criteria không hợp lệ",
        });
      }

      const result = await rubricCriteriaService.deleteCriteria(
        parseInt(criteriaId)
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Delete rubric criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

module.exports = new RubricCriteriaController();