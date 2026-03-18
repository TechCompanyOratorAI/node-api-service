const { validationResult } = require("express-validator");
const rubricTemplateService = require("../services/rubricTemplateService");

class RubricTemplateController {
  /**
   * POST /rubric-templates
   * Create a rubric template
   */
  async createTemplate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      const result = await rubricTemplateService.createTemplate(req.body, userId);

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Create rubric template controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /rubric-templates
   * Get all active rubric templates
   */
  async getAllTemplates(req, res) {
    try {
      const result = await rubricTemplateService.getAllActiveTemplates();

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get all rubric templates controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /rubric-templates/all
   * Get all rubric templates with pagination and filters (admin only)
   */
  async getAllTemplatesAdmin(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;
      const search = req.query.search || undefined;

      const result = await rubricTemplateService.getAllTemplates({
        page,
        limit,
        isActive,
        search,
      });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get all rubric templates admin controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /rubric-templates/:templateId
   * Get rubric template detail
   */
  async getTemplateById(req, res) {
    try {
      const { templateId } = req.params;

      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json({
          success: false,
          message: "ID template không hợp lệ",
        });
      }

      const result = await rubricTemplateService.getTemplateById(parseInt(templateId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get rubric template by id controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PUT /rubric-templates/:templateId
   * Update rubric template
   */
  async updateTemplate(req, res) {
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

      const userId = req.user?.userId;
      const result = await rubricTemplateService.updateTemplate(
        parseInt(templateId),
        req.body,
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Update rubric template controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * DELETE /rubric-templates/:templateId
   * Soft delete rubric template
   */
  async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params;

      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json({
          success: false,
          message: "ID template không hợp lệ",
        });
      }

      const result = await rubricTemplateService.deleteTemplate(parseInt(templateId));

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "TEMPLATE_IN_USE") {
        return res.status(409).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Delete rubric template controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

module.exports = new RubricTemplateController();