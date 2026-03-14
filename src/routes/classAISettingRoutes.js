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
  //requireRole(["Admin", "Instructor"]),
  classAISettingController.getClassAISetting
);

// PUT /classes/:classId/ai-settings - Update active AI settings of a class
router.put(
  "/:classId/ai-settings",
  requireRole(["Admin", "Instructor"]),
  validateClassAISetting,
  classAISettingController.updateClassAISetting
);

export default router;