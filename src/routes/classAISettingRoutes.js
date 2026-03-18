import express from "express";
import classAISettingController from "../controllers/classAISettingController.js";
import {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} from "../middleware/authMiddleware.js";
import { validateClassAISetting } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

/**
 * ClassAISettings Routes
 * Base path: /classes/:classId/ai-settings
 */

// POST /classes/:classId/ai-settings - Create class AI settings
router.post(
  "/:classId/ai-settings",
  requireRole(["Admin", "Instructor"]),
  validateClassAISetting,
  classAISettingController.createClassAISetting
);

// GET /classes/:classId/ai-settings - Get active AI settings of a class
router.get(
  "/:classId/ai-settings",
  requireRole(["Admin", "Instructor"]),
  classAISettingController.getClassAISetting
);

// PUT /classes/:classId/ai-settings - Update active AI settings of a class
router.put(
  "/:classId/ai-settings",
  requireRole(["Admin", "Instructor"]),
  validateClassAISetting,
  classAISettingController.updateClassAISetting
);

// DELETE /classes/:classId/ai-settings - Delete (deactivate) class AI settings
router.delete(
  "/:classId/ai-settings",
  requireRole(["Admin", "Instructor"]),
  classAISettingController.deleteClassAISetting
);

// GET /classesAISettings - Get all class AI settings (admin only)
router.get(
  "/",
  requireRole(["Admin"]),
  classAISettingController.getAllClassAISettings
);

// GET /classesAISettings/:settingId - Get class AI setting by ID
router.get(
  "/:settingId",
  requireRole(["Admin", "Instructor"]),
  classAISettingController.getClassAISettingById
);

export default router;