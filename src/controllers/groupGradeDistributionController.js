import { validationResult } from "express-validator";
import groupGradeDistributionService from "../services/groupGradeDistributionService.js";

class GroupGradeDistributionController {
  /**
   * POST /api/ai-reports/:reportId/distribute-grade
   * Leader chia điểm cho các thành viên nhóm
   */
  async distributeGrade(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { reportId } = req.params;
      const { reason, members } = req.body;
      const userId = req.user?.userId;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Danh sách thành viên nhận điểm không hợp lệ",
        });
      }

      const result = await groupGradeDistributionService.distributeGrade({
        reportId: parseInt(reportId),
        leaderStudentId: userId,
        reason: reason || null,
        members,
      });

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "INVALID_REPORT_STATUS") {
        return res.status(400).json(result);
      } else if (result.code === "NOT_LEADER") {
        return res.status(403).json(result);
      } else if (result.code === "NOT_GROUP_TOPIC") {
        return res.status(400).json(result);
      } else if (result.code === "INVALID_MEMBER") {
        return res.status(400).json(result);
      } else if (result.code === "DUPLICATE_MEMBER") {
        return res.status(400).json(result);
      } else if (result.code === "INVALID_PERCENTAGE" || result.code === "INVALID_PERCENTAGE_RANGE") {
        return res.status(400).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Distribute grade controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /api/ai-reports/:reportId/grade-distribution
   * Lấy thông tin phân chia điểm cho 1 report
   */
  async getDistributionByReport(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user?.userId;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await groupGradeDistributionService.getDistributionByReport(
        parseInt(reportId),
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get distribution by report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /api/groups/:groupId/grade-distributions
   * Lấy tất cả phân chia điểm của 1 nhóm
   */
  async getDistributionsByGroup(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user?.userId;

      if (!groupId || isNaN(parseInt(groupId))) {
        return res.status(400).json({
          success: false,
          message: "ID nhóm không hợp lệ",
        });
      }

      const result = await groupGradeDistributionService.getDistributionsByGroup(
        parseInt(groupId),
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_MEMBER") {
        return res.status(403).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get distributions by group controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /api/groups/:groupId/members/:studentId/grades
   * Lấy điểm cá nhân của 1 thành viên trong nhóm
   */
  async getMemberGradesInGroup(req, res) {
    try {
      const { groupId, studentId } = req.params;
      const userId = req.user?.userId;

      if (!groupId || isNaN(parseInt(groupId))) {
        return res.status(400).json({
          success: false,
          message: "ID nhóm không hợp lệ",
        });
      }

      // Chỉ cho phép thành viên trong nhóm hoặc chính mình xem
      const requestingStudentId = parseInt(studentId);
      if (requestingStudentId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể xem điểm của chính mình",
        });
      }

      const result = await groupGradeDistributionService.getMemberGradesInGroup(
        parseInt(groupId),
        requestingStudentId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_MEMBER") {
        return res.status(403).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get member grades in group controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

export default new GroupGradeDistributionController();