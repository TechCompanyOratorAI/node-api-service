const { validationResult } = require("express-validator");
const classRubricCriteriaService = require("../services/classRubricCriteriaService");

class ClassRubricCriteriaController {
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

      // Force maxScore to always be 100
      req.body.maxScore = 100;

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

      // Force maxScore to always be 100
      if (req.body.maxScore !== undefined) {
        req.body.maxScore = 100;
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
      } else if (result.code === "CANNOT_DELETE_TEMPLATE_CRITERIA") {
        return res.status(403).json(result);
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

  /**
   * GET /class-rubric-criteria/:classRubricCriteriaId
   * Get a single class rubric criterion by ID
   */
  async getCriterionById(req, res) {
    try {
      const { classRubricCriteriaId } = req.params;

      if (!classRubricCriteriaId || isNaN(parseInt(classRubricCriteriaId))) {
        return res.status(400).json({
          success: false,
          message: "ID criteria không hợp lệ",
        });
      }

      const result = await classRubricCriteriaService.getCriterionById(
        parseInt(classRubricCriteriaId)
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get criterion by ID controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PATCH /class-rubric-criteria/:classRubricCriteriaId/restore
   * Restore a soft-deleted criterion
   */
  async restoreCriterion(req, res) {
    try {
      const { classRubricCriteriaId } = req.params;

      if (!classRubricCriteriaId || isNaN(parseInt(classRubricCriteriaId))) {
        return res.status(400).json({
          success: false,
          message: "ID criteria không hợp lệ",
        });
      }

      const userId = req.user?.userId;
      const result = await classRubricCriteriaService.restoreCriterion(
        parseInt(classRubricCriteriaId),
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Restore criterion controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * POST /class-rubric-criteria/reorder
   * Reorder multiple criteria (bulk update displayOrder)
   */
  async reorderCriteria(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { orders } = req.body; // Array of { classRubricCriteriaId, displayOrder }

      if (!Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Danh sách sắp xếp không hợp lệ",
        });
      }

      const userId = req.user?.userId;
      const result = await classRubricCriteriaService.reorderCriteria(
        orders,
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Reorder criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * POST /class-rubric-criteria/bulk-delete
   * Soft delete multiple criteria at once
   */
  async bulkDeleteCriteria(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { classRubricCriteriaIds } = req.body; // Array of IDs

      if (!Array.isArray(classRubricCriteriaIds) || classRubricCriteriaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Danh sách ID criteria không hợp lệ",
        });
      }

      const result = await classRubricCriteriaService.bulkDeleteCriteria(
        classRubricCriteriaIds
      );

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "CANNOT_DELETE_TEMPLATE_CRITERIA") {
        return res.status(403).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Bulk delete criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /classes/:classId/rubric/all
   * Get all class rubric criteria including inactive
   */
  async getAllClassRubricCriteria(req, res) {
    try {
      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const result = await classRubricCriteriaService.getAllClassRubricCriteria(
        parseInt(classId)
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get all class rubric criteria controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

module.exports = new ClassRubricCriteriaController();