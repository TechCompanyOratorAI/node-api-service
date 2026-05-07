import { validationResult } from "express-validator";
import aiReportService from "../services/aiReportService.js";
import presentationService from "../services/presentationService.js";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeFileName = (value = "ai-report") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "ai-report";

const buildReportDocHtml = ({ title, reportContent, updatedAt }) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #111827; }
    h1 { font-size: 20pt; margin: 0 0 8pt; }
    .meta { color: #6b7280; font-size: 10pt; margin-bottom: 18pt; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">AI Report${updatedAt ? ` - Updated ${escapeHtml(new Date(updatedAt).toISOString())}` : ""}</div>
  <div class="content">${escapeHtml(reportContent)}</div>
</body>
</html>`;

class AIReportController {
  /**
   * POST /ai-reports/generate
   * Generate AI report for a submission
   */
  async generateReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { presentationId, classId } = req.body;
      const userId = req.user?.userId;

      const result = await aiReportService.generateReport(
        parseInt(presentationId),
        parseInt(classId),
        userId
      );

      if (result.success) {
        return res.status(201).json(result);
      } else if (result.code === "AI_REPORT_DISABLED") {
        return res.status(400).json(result);
      } else if (result.code === "EMPTY_CLASS_RUBRIC") {
        return res.status(400).json(result);
      } else if (result.code === "INVALID_CRITERIA_WEIGHT") {
        return res.status(400).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Generate AI report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /ai-reports/:reportId
   * Get report detail
   */
  async getReportById(req, res) {
    try {
      const { reportId } = req.params;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await aiReportService.getReportById(parseInt(reportId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Get AI report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /classes/:classId/ai-reports
   * Get all reports of a class
   */
  async getReportsByClass(req, res) {
    try {
      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;

      const result = await aiReportService.getReportsByClass(parseInt(classId), {
        page,
        limit,
        status,
      });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get AI reports by class controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PUT /ai-reports/:reportId/confirm
   * Instructor confirms the AI report
   */
  async confirmReport(req, res) {
    try {
      const { reportId } = req.params;
      const { feedbackOfInstructor, gradeForInstructor } = req.body;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      // Validate required fields
      if (!feedbackOfInstructor || typeof feedbackOfInstructor !== "string" || feedbackOfInstructor.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "feedbackOfInstructor là bắt buộc và không được để trống",
        });
      }

      if (gradeForInstructor === undefined || gradeForInstructor === null || isNaN(Number(gradeForInstructor))) {
        return res.status(400).json({
          success: false,
          message: "gradeForInstructor là bắt buộc và phải là số",
        });
      }

      const grade = Number(gradeForInstructor);
      if (grade < 0 || grade > 10) {
        return res.status(400).json({
          success: false,
          message: "gradeForInstructor phải nằm trong khoảng 0 - 10",
        });
      }

      const instructorId = req.user?.userId;
      const result = await aiReportService.confirmReport(parseInt(reportId), instructorId, feedbackOfInstructor.trim(), grade);

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "INVALID_STATUS") {
        return res.status(400).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Confirm AI report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PUT /ai-reports/:reportId/edit
   * Instructor edits report content and/or criterion scores
   */
  async editReport(req, res) {
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

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const instructorId = req.user?.userId;
      const result = await aiReportService.editReport(
        parseInt(reportId),
        req.body,
        instructorId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "EDIT_NOT_ALLOWED") {
        return res.status(403).json(result);
      } else if (result.code === "INVALID_STATUS") {
        return res.status(400).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Edit AI report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * PUT /ai-reports/:reportId/reject
   * Instructor rejects the AI report
   */
  async rejectReport(req, res) {
    try {
      const { reportId } = req.params;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const instructorId = req.user?.userId;
      const result = await aiReportService.rejectReport(parseInt(reportId), instructorId);

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "INVALID_STATUS") {
        return res.status(400).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Reject AI report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /ai-reports/submission/:presentationId
   * Get AI report by presentation ID
   */
  async getReportBySubmission(req, res) {
    try {
      const { presentationId } = req.params;

      if (!presentationId || isNaN(parseInt(presentationId))) {
        return res.status(400).json({
          success: false,
          message: "ID presentation không hợp lệ",
        });
      }

      const result = await aiReportService.getReportBySubmission(parseInt(presentationId));

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_FOUND") {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get AI report by presentation controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /ai-reports/presentation/:presentationId/download-doc
   * Download AI reportContent by presentation ID as a .doc file
   */
  async downloadReportDocByPresentation(req, res) {
    try {
      const { presentationId } = req.params;

      if (!presentationId || isNaN(parseInt(presentationId))) {
        return res.status(400).json({
          success: false,
          message: "ID presentation khÃ´ng há»£p lá»‡",
        });
      }

      const parsedPresentationId = parseInt(presentationId);
      const hasAccess = await presentationService.checkPresentationAccess(
        parsedPresentationId,
        req.user?.userId,
        req.user?.role
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "KhÃ´ng cÃ³ quyá»n táº£i AI report cá»§a presentation nÃ y",
        });
      }

      const result = await aiReportService.getReportDocumentByPresentation(parsedPresentationId);

      if (!result.success) {
        if (result.code === "NOT_FOUND") {
          return res.status(404).json(result);
        }
        if (result.code === "EMPTY_REPORT_CONTENT") {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      const html = buildReportDocHtml(result.data);
      const filename = `${sanitizeFileName(result.data.title)}-ai-report.doc`;

      res.setHeader("Content-Type", "application/msword; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send(Buffer.from(html, "utf8"));
    } catch (error) {
      console.error("Download AI report doc controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lá»—i server ná»™i bá»™",
      });
    }
  }

  /**
   * PATCH /ai-reports/:reportId/status
   * Cập nhật trạng thái AI report
   */
  async updateReportStatus(req, res) {
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
      const { reportStatus } = req.body;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await aiReportService.updateReportStatus(
        parseInt(reportId),
        reportStatus
      );

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_FOUND") {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Update report status controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * DELETE /ai-reports/:reportId
   * Delete AI report
   */
  async deleteReport(req, res) {
    try {
      const { reportId } = req.params;

      if (!reportId || isNaN(parseInt(reportId))) {
        return res.status(400).json({
          success: false,
          message: "ID report không hợp lệ",
        });
      }

      const result = await aiReportService.deleteReport(parseInt(reportId));

      if (result.success) {
        return res.status(200).json(result);
      } else if (result.code === "NOT_FOUND") {
        return res.status(404).json(result);
      } else if (result.code === "INVALID_STATUS") {
        return res.status(400).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Delete AI report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /ai-reports
   * Get all AI reports (admin/instructor)
   */
  async getAllReports(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const classId = req.query.classId ? parseInt(req.query.classId) : undefined;
      const status = req.query.status;

      const result = await aiReportService.getAllReports({
        page,
        limit,
        classId,
        status,
      });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get all AI reports controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

export default new AIReportController();
