const { validationResult } = require("express-validator");
const classRubricCriteriaService = require("../services/classRubricCriteriaService");

class ClassRubricCriteriaController {
  /**
   * POST /classes/:classId/rubric/copy-template/:templateId
   * Copy all active criteria from RubricCriteria into ClassRubricCriteria
   */
  async copyFromTemplate(req, res) {
    try {
      const { classId, templateId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json({
          success: false,
          message: "ID template không hợp lệ",
        });
      }

      const userId = req.user?.userId;
      const result = await classRubricCriteriaService.copyFromTemplate(
        parseInt(classId),
        parseInt(templateId),
        userId
      );

      if (result.success) {
        return res.status(201).json(result);
      } else if (result.code === "ALREADY_COPIED") {
        return res.status(409).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Copy rubric criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /classes/:classId/rubric
   * Get all active class rubric criteria
   */
  async getClassRubricCriteria(req, res) {
    try {
      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const result = await classRubricCriteriaService.getClassRubricCriteria(
        parseInt(classId)
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get class rubric criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * POST /classes/:classId/rubric/criteria
   * Add a custom class criterion
   */
  async createCustomCriterion(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const userId = req.user?.userId;
      const result = await classRubricCriteriaService.createCustomCriterion(
        parseInt(classId),
        req.body,
        userId
      );

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Create custom criterion controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PUT /class-rubric-criteria/:classRubricCriteriaId
   * Update a class rubric criterion
   */
  async updateCriterion(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { classRubricCriteriaId } = req.params;

      if (!classRubricCriteriaId || isNaN(parseInt(classRubricCriteriaId))) {
        return res.status(400).json({
          success: false,
          message: "ID criteria không hợp lệ",
        });
      }

      const result = await classRubricCriteriaService.updateCriterion(
        parseInt(classRubricCriteriaId),
        req.body
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Update class rubric criterion controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * DELETE /class-rubric-criteria/:classRubricCriteriaId
   * Soft delete a class rubric criterion
   */
  async deleteCriterion(req, res) {
    try {
      const { classRubricCriteriaId } = req.params;

      if (!classRubricCriteriaId || isNaN(parseInt(classRubricCriteriaId))) {
        return res.status(400).json({
          success: false,
          message: "ID criteria không hợp lệ",
        });
      }

      const result = await classRubricCriteriaService.deleteCriterion(
        parseInt(classRubricCriteriaId)
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Delete class rubric criterion controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

module.exports = new ClassRubricCriteriaController();