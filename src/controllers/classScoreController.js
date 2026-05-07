"use strict";

const classScoreService = require("../services/classScoreService");

class ClassScoreController {
  /**
   * Get all students and their scores for a class
   * GET /api/v1/classes/:classId/scores
   */
  async getClassScores(req, res) {
    try {
      const { classId } = req.params;
      const { userId, role: userRole } = req.user;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "classId không hợp lệ",
        });
      }

      const result = await classScoreService.getClassScores(
        parseInt(classId),
        userId,
        userRole
      );

      if (result.success) {
        return res.status(200).json(result);
      }

      if (result.code === "CLASS_NOT_FOUND") {
        return res.status(404).json(result);
      }

      return res.status(403).json(result);
    } catch (error) {
      console.error("Get class scores controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * Export class scores to Excel file
   * GET /api/v1/classes/:classId/scores/export
   */
  async exportClassScoresExcel(req, res) {
    try {
      const { classId } = req.params;
      const { userId, role: userRole } = req.user;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "classId không hợp lệ",
        });
      }

      const result = await classScoreService.exportClassScoresToExcel(
        parseInt(classId),
        userId,
        userRole
      );

      if (!result.success) {
        if (result.code === "CLASS_NOT_FOUND") {
          return res.status(404).json(result);
        }
        return res.status(403).json(result);
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.setHeader("Content-Length", result.buffer.length);

      return res.status(200).send(result.buffer);
    } catch (error) {
      console.error("Export class scores Excel error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi xuất file Excel",
      });
    }
  }
}

module.exports = new ClassScoreController();
