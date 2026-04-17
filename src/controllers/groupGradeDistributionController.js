const { validationResult } = require("express-validator");
const groupGradeDistributionService = require("../services/groupGradeDistributionService");

class GroupGradeDistributionController {
  /**
   * POST /api/ai-reports/:reportId/distribute-grade
   * Leader nộp / cập nhật phân chia điểm
   */
  async distributeGrade(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ", errors: errors.array() });
      }

      const { reportId } = req.params;
      const { reason, members } = req.body;
      const userId = req.user?.userId;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({ success: false, message: "ID report không hợp lệ" });
      }
      if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ success: false, message: "Danh sách thành viên nhận điểm không hợp lệ" });
      }

      const result = await groupGradeDistributionService.distributeGrade({
        reportId: parseInt(reportId),
        leaderStudentId: userId,
        reason: reason || null,
        members,
      });

      if (result.success) return res.status(200).json(result);

      const codeStatusMap = {
        ALREADY_FINALIZED: 403,
        ALREADY_SUBMITTED: 409,
        NOT_LEADER: 403,
        NOT_GROUP_TOPIC: 400,
        INVALID_MEMBER: 400,
        DUPLICATE_MEMBER: 400,
        INVALID_PERCENTAGE: 400,
        INVALID_PERCENTAGE_RANGE: 400,
        INVALID_REPORT_STATUS: 400,
      };
      const status = codeStatusMap[result.code] || 404;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Distribute grade controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  /**
   * GET /api/ai-reports/:reportId/grade-distribution
   * Lấy thông tin phân chia điểm của 1 report
   */
  async getDistributionByReport(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user?.userId;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({ success: false, message: "ID report không hợp lệ" });
      }

      const result = await groupGradeDistributionService.getDistributionByReport(parseInt(reportId), userId);
      return result.success ? res.status(200).json(result) : res.status(404).json(result);
    } catch (error) {
      console.error("Get distribution by report controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
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
        return res.status(400).json({ success: false, message: "ID nhóm không hợp lệ" });
      }

      const result = await groupGradeDistributionService.getDistributionsByGroup(parseInt(groupId), userId);
      if (result.success) return res.status(200).json(result);
      if (result.code === "NOT_MEMBER") return res.status(403).json(result);
      return res.status(400).json(result);
    } catch (error) {
      console.error("Get distributions by group controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
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
        return res.status(400).json({ success: false, message: "ID nhóm không hợp lệ" });
      }

      const requestingStudentId = parseInt(studentId);
      if (requestingStudentId !== userId) {
        return res.status(403).json({ success: false, message: "Bạn chỉ có thể xem điểm của chính mình" });
      }

      const result = await groupGradeDistributionService.getMemberGradesInGroup(parseInt(groupId), requestingStudentId);
      if (result.success) return res.status(200).json(result);
      if (result.code === "NOT_MEMBER") return res.status(403).json(result);
      return res.status(400).json(result);
    } catch (error) {
      console.error("Get member grades in group controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  /**
   * POST /api/groups/:groupId/grade-distributions/:distributionId/feedback
   * Thành viên gửi phản hồi về điểm được chia
   */
  async submitMemberFeedback(req, res) {
    try {
      const { groupId, distributionId } = req.params;
      const { feedback } = req.body;
      const userId = req.user?.userId;

      if (!distributionId || isNaN(parseInt(distributionId))) {
        return res.status(400).json({ success: false, message: "ID phân chia điểm không hợp lệ" });
      }

      const result = await groupGradeDistributionService.submitMemberFeedback({
        distributionId: parseInt(distributionId),
        studentId: userId,
        feedback,
      });

      if (result.success) return res.status(200).json(result);
      if (result.code === "ALREADY_FINALIZED") return res.status(403).json(result);
      if (result.code === "NOT_MEMBER") return res.status(403).json(result);
      return res.status(400).json(result);
    } catch (error) {
      console.error("Submit member feedback controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  /**
   * PUT /api/groups/:groupId/grade-distributions/:distributionId/reopen
   * Instructor mở lại phân chia điểm cho leader sửa
   */
  async reopenDistribution(req, res) {
    try {
      const { groupId, distributionId } = req.params;
      const userId = req.user?.userId;

      if (!distributionId || isNaN(parseInt(distributionId))) {
        return res.status(400).json({ success: false, message: "ID phân chia điểm không hợp lệ" });
      }

      const result = await groupGradeDistributionService.reopenDistribution({
        distributionId: parseInt(distributionId),
        instructorId: userId,
        groupId: parseInt(groupId),
      });

      if (result.success) return res.status(200).json(result);
      if (result.code === "FORBIDDEN") return res.status(403).json(result);
      if (result.code === "ALREADY_FINALIZED") return res.status(403).json(result);
      if (result.code === "MAX_REOPEN_REACHED") return res.status(400).json(result);
      return res.status(400).json(result);
    } catch (error) {
      console.error("Reopen distribution controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  /**
   * GET /api/classes/:classId/group-grade-distributions
   * Lấy tất cả phân chia điểm của tất cả nhóm trong 1 lớp (Instructor)
   */
  async getGradeDistributionsByClass(req, res) {
    try {
      const { classId } = req.params;
      const userId = req.user?.userId;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({ success: false, message: "ID lớp không hợp lệ" });
      }

      const result = await groupGradeDistributionService.getGradeDistributionsByClass(
        parseInt(classId),
        userId
      );
      if (result.success) return res.status(200).json(result);
      if (result.code === "FORBIDDEN") return res.status(403).json(result);
      return res.status(400).json(result);
    } catch (error) {
      console.error("Get grade distributions by class controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  /**
   * PUT /api/groups/:groupId/grade-distributions/:distributionId/finalize
   * Instructor chốt điểm vĩnh viễn
   */
  async finalizeDistribution(req, res) {
    try {
      const { groupId, distributionId } = req.params;
      const userId = req.user?.userId;

      if (!distributionId || isNaN(parseInt(distributionId))) {
        return res.status(400).json({ success: false, message: "ID phân chia điểm không hợp lệ" });
      }

      const result = await groupGradeDistributionService.finalizeDistribution({
        distributionId: parseInt(distributionId),
        instructorId: userId,
        groupId: parseInt(groupId),
      });

      if (result.success) return res.status(200).json(result);
      if (result.code === "FORBIDDEN") return res.status(403).json(result);
      if (result.code === "ALREADY_FINALIZED") return res.status(400).json(result);
      return res.status(400).json(result);
    } catch (error) {
      console.error("Finalize distribution controller error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }
}

module.exports = new GroupGradeDistributionController();