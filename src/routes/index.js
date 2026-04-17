import express from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import feedbackRoutes from "./feedbackRoutes.js";
import emailRoutes from "./emailRoutes.js";
import courseRoutes from "./courseRoutes.js";
import topicRoutes from "./topicRoutes.js";
import enrollmentRoutes from "./enrollmentRoutes.js";
import roleRoutes from "./roleRoutes.js";
import presentationRoutes from "./presentationRoutes.js";
import webhookRoutes from "./webhookRoutes.js";
import speakerRoutes from "./speakerRoutes.js";
import jobRoutes from "./jobRoutes.js";
import storageRoutes from "./storageRoutes.js";
import classRoutes from "./classRoutes.js";
import groupRoutes from "./groupRoutes.js";
import enrollKeyRoutes from "./enrollKeyRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import speechQualityRoutes from "./speechQualityRoutes.js";
import rubricTemplateRoutes from "./rubricTemplateRoutes.js";
import rubricCriteriaRoutes from "./rubricCriteriaRoutes.js";
import classAISettingRoutes from "./classAISettingRoutes.js";
import classRubricCriteriaRoutes from "./classRubricCriteriaRoutes.js";
import aiReportRoutes from "./aiReportRoutes.js";
import aiReportFeedbackRoutes from "./aiReportFeedbackRoutes.js";
import shareRoutes from "./shareRoutes.js";
import instructorRoutes from "./instructorRoutes.js";
import adminDashboardController from "../controllers/adminDashboardController.js";
import devBypassRoutes from "./devBypassRoutes.js";
import enrollmentController from "../controllers/enrollmentController.js";
import classController from "../controllers/classController.js";
import {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/email", emailRoutes);
router.use("/courses", courseRoutes);
router.use("/topics", topicRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/roles", roleRoutes);
router.use("/presentations", presentationRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/speakers", speakerRoutes);
router.use("/jobs", jobRoutes);
router.use("/storage", storageRoutes);
router.use("/classes", classRoutes);
router.use("/classesAISettings", classAISettingRoutes);
router.use("/classesRubricCriteria", classRubricCriteriaRoutes);
router.use("/enroll-keys", enrollKeyRoutes);
router.use("/groups", groupRoutes);
router.use("/departments", departmentRoutes);
router.use("/speech-quality", speechQualityRoutes);
router.use("/rubric-templates", rubricTemplateRoutes);
router.use("/rubric-criteria", rubricCriteriaRoutes);
router.use("/ai-reports", aiReportRoutes);
router.use("/ai-reports", aiReportFeedbackRoutes);

// ─── Share routes ───────────────────────────────────────────────
// Public view: GET /share/:token (no authentication needed)
router.use("/share", shareRoutes);

// ─── Instructor routes ───────────────────────────────────────────
router.use("/instructor", instructorRoutes);

// ─── Admin routes ───────────────────────────────────────────────
router.get(
  "/admin/dashboard",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin"]),
  adminDashboardController.getDashboard,
);

// ⚠️  DEV BYPASS — no auth, testing only ────────────────────────
router.use("/dev/bypass", devBypassRoutes);

router.get(
  "/me/classes",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Student"]),
  enrollmentController.getMyClasses,
);

// Instructor quick access routes
router.get(
  "/me/teaching-classes",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Instructor"]),
  classController.getMyTeachingClasses,
);

// 404 handler for API routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

export default router;
