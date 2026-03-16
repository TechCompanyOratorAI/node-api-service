import express from "express";
import rubricCriteriaController from "../controllers/rubricCriteriaController.js";
import {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} from "../middleware/authMiddleware.js";
import { validateRubricCriteria } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

/**
 * RubricCriteria Routes
 * Base path: /rubric-templates/:templateId/criteria
 * Base path: /rubric-criteria
 */

// POST /rubric-templates/:templateId/criteria - Add a criterion to a rubric template
router.post(
  "/:templateId/criteria",
  requireRole(["Admin"]),
  validateRubricCriteria,
  rubricCriteriaController.createCriteria
);

// GET /rubric-templates/:templateId/criteria - Get all active criteria of a template
router.get(
  "/:templateId/criteria",
  requireRole(["Admin", "Instructor"]),
  rubricCriteriaController.getCriteriaByTemplate
);

// PUT /rubric-criteria/:criteriaId - Update a rubric criterion
router.put(
  "/rubric-criteria/:criteriaId",
  requireRole(["Admin"]),
  validateRubricCriteria,
  rubricCriteriaController.updateCriteria
);

// DELETE /rubric-criteria/:criteriaId - Soft delete a rubric criterion
router.delete(
  "/rubric-criteria/:criteriaId",
  requireRole(["Admin"]),
  rubricCriteriaController.deleteCriteria
);

export default router;