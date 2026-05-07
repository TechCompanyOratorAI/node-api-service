import express from "express";
import rubricTemplateController from "../controllers/rubricTemplateController.js";
import {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} from "../middleware/authMiddleware.js";
import { validateRubricTemplate } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

/**
 * RubricTemplates Routes
 * Base path: /rubric-templates
 */

// POST /rubric-templates - Create a rubric template
router.post(
  "/",
  requireRole(["Admin"]),
  validateRubricTemplate,
  rubricTemplateController.createTemplate
);

// GET /rubric-templates - Get all active rubric templates
router.get(
  "/",
  //requireRole(["Admin", "Instructor"]),
  rubricTemplateController.getAllTemplates
);

// GET /rubric-templates/all - Get all rubric templates with pagination (admin only)
router.get(
  "/all",
  requireRole(["Admin"]),
  rubricTemplateController.getAllTemplatesAdmin
);

// GET /rubric-templates/:templateId - Get rubric template detail
router.get(
  "/:templateId",
  requireRole(["Admin", "Instructor"]),
  rubricTemplateController.getTemplateById
);

// PUT /rubric-templates/:templateId - Update rubric template
router.put(
  "/:templateId",
  requireRole(["Admin"]),
  validateRubricTemplate,
  rubricTemplateController.updateTemplate
);

// PUT /rubric-templates/:templateId/criteria - Update criteria for rubric template
router.put(
  "/:templateId/criteria",
  requireRole(["Admin"]),
  rubricTemplateController.updateCriteria
);

// DELETE /rubric-templates/:templateId - Hard delete rubric template
router.delete(
  "/:templateId",
  requireRole(["Admin"]),
  rubricTemplateController.deleteTemplate
);

export default router;