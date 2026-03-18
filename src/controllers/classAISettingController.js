const { validationResult } = require("express-validator");
const classAISettingService = require("../services/classAISettingService");

class ClassAISettingController {
  /**
   * POST /classes/:classId/ai-settings
   * Create class AI settings
   */
  async createClassAISetting(req, res) {
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
      const result = await classAISettingService.createClassAISetting(
        parseInt(classId),
        req.body,
        userId
      );

      if (result.success) {
        return res.status(201).json(result);
      } else if (result.code === "DUPLICATE_ACTIVE_SETTING") {
        return res.status(409).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Create class AI setting controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /classes/:classId/ai-settings
   * Get active AI settings of a class
   */
  async getClassAISetting(req, res) {
    try {
      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const result = await classAISettingService.getClassAISetting(parseInt(classId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get class AI setting controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PUT /classes/:classId/ai-settings
   * Update active AI settings of a class
   */
  async updateClassAISetting(req, res) {
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
      const result = await classAISettingService.updateClassAISetting(
        parseInt(classId),
        req.body,
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Update class AI setting controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * DELETE /classes/:classId/ai-settings
   * Delete (deactivate) class AI settings
   */
  async deleteClassAISetting(req, res) {
    try {
      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const result = await classAISettingService.deleteClassAISetting(parseInt(classId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Delete class AI setting controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /classesAISettings
   * Get all class AI settings (admin only)
   */
  async getAllClassAISettings(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const classId = req.query.classId ? parseInt(req.query.classId) : undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

      const result = await classAISettingService.getAllClassAISettings({
        page,
        limit,
        classId,
        isActive,
      });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get all class AI settings controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /classesAISettings/:settingId
   * Get class AI setting by ID
   */
  async getClassAISettingById(req, res) {
    try {
      const { settingId } = req.params;

      if (!settingId || isNaN(parseInt(settingId))) {
        return res.status(400).json({
          success: false,
          message: "ID setting không hợp lệ",
        });
      }

      const result = await classAISettingService.getClassAISettingById(parseInt(settingId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get class AI setting by ID controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

module.exports = new ClassAISettingController();