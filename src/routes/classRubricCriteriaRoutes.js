import express from "express";
import classRubricCriteriaController from "../controllers/classRubricCriteriaController.js";
import {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} from "../middleware/authMiddleware.js";
import { validateClassRubricCriteria, validateClassRubricCustomCriteria } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

/**
 * ClassRubricCriteria Routes
 * Base path: /classes/:classId/rubric
 * Base path: /class-rubric-criteria
 */

// POST /classes/:classId/rubric/copy-template/:templateId - Copy criteria from template
router.post(
  "/:classId/rubric/copy-template/:templateId",
  requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.copyFromTemplate
);

// GET /classes/:classId/rubric - Get all active class rubric criteria
router.get(
  "/:classId/rubric",
  //requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.getClassRubricCriteria
);

// POST /classes/:classId/rubric/criteria - Add a custom class criterion
router.post(
  "/:classId/rubric/criteria",
  requireRole(["Admin", "Instructor"]),
  validateClassRubricCustomCriteria,
  classRubricCriteriaController.createCustomCriterion
);

// PUT /class-rubric-criteria/:classRubricCriteriaId - Update a class rubric criterion
router.put(
  "/class-rubric-criteria/:classRubricCriteriaId",
  requireRole(["Admin", "Instructor"]),
  validateClassRubricCriteria,
  classRubricCriteriaController.updateCriterion
);

// DELETE /class-rubric-criteria/:classRubricCriteriaId - Soft delete a class rubric criterion
router.delete(
  "/class-rubric-criteria/:classRubricCriteriaId",
  requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.deleteCriterion
);

export default router;