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
  "/:criteriaId",
  requireRole(["Admin"]),
  validateRubricCriteria,
  rubricCriteriaController.updateCriteria
);

// DELETE /rubric-criteria/:criteriaId - Soft delete a rubric criterion
router.delete(
  "/:criteriaId",
  requireRole(["Admin"]),
  rubricCriteriaController.deleteCriteria
);

// GET /rubric-criteria - Get all rubric criteria (admin only)
router.get(
  "/",
  requireRole(["Admin"]),
  rubricCriteriaController.getAllCriteria
);

// GET /rubric-criteria/:criteriaId - Get rubric criteria by ID
router.get(
  "/:criteriaId",
  requireRole(["Admin", "Instructor"]),
  rubricCriteriaController.getCriteriaById
);

export default router;