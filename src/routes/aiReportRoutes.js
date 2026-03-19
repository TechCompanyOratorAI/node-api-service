import express from "express";
import aiReportController from "../controllers/aiReportController.js";
import {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} from "../middleware/authMiddleware.js";
import { validateGenerateAIReport, validateEditAIReport, validateUpdateAIReportStatus } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

/**
 * AIReports Routes
 * Base path: /ai-reports
 * Base path: /classes/:classId/ai-reports
 */

// POST /ai-reports/generate - Generate AI report for a submission
router.post(
  "/generate",
  requireRole(["Admin", "Instructor"]),
  validateGenerateAIReport,
  aiReportController.generateReport
);

// GET /ai-reports/:reportId - Get report detail
router.get(
  "/:reportId",
  requireRole(["Admin", "Instructor"]),
  aiReportController.getReportById
);

// GET /classes/:classId/ai-reports - Get all reports of a class
router.get(
  "/classes/:classId/ai-reports",
  //requireRole(["Admin", "Instructor"]),
  aiReportController.getReportsByClass
);

// PUT /ai-reports/:reportId/confirm - Instructor confirms the AI report
router.put(
  "/:reportId/confirm",
  requireRole(["Admin", "Instructor"]),
  aiReportController.confirmReport
);

// PUT /ai-reports/:reportId/edit - Instructor edits report content and/or scores
router.put(
  "/:reportId/edit",
  requireRole(["Admin", "Instructor"]),
  validateEditAIReport,
  aiReportController.editReport
);

// PUT /ai-reports/:reportId/reject - Instructor rejects the AI report
router.put(
  "/:reportId/reject",
  requireRole(["Admin", "Instructor"]),
  aiReportController.rejectReport
);

// PATCH /ai-reports/:reportId/status - Update AI report status
router.patch(
  "/:reportId/status",
  requireRole(["Admin", "Instructor"]),
  validateUpdateAIReportStatus,
  aiReportController.updateReportStatus
);

// GET /ai-reports/submission/:submissionId - Get AI report by submission ID
router.get(
  "/submission/:submissionId",
  requireRole(["Admin", "Instructor", "Student"]),
  aiReportController.getReportBySubmission
);

// DELETE /ai-reports/:reportId - Delete AI report
router.delete(
  "/:reportId",
  requireRole(["Admin", "Instructor"]),
  aiReportController.deleteReport
);

// GET /ai-reports - Get all AI reports (with pagination)
router.get(
  "/",
  requireRole(["Admin", "Instructor"]),
  aiReportController.getAllReports
);

export default router;