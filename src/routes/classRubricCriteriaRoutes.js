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

// GET /classes/:classId/rubric - Get all active class rubric criteria
router.get(
  "/:classId/rubric",
  requireRole(["Admin", "Instructor"]),
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

// GET /class-rubric-criteria/:classRubricCriteriaId - Get a single class rubric criterion by ID
router.get(
  "/class-rubric-criteria/:classRubricCriteriaId",
  requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.getCriterionById
);

// PATCH /class-rubric-criteria/:classRubricCriteriaId/restore - Restore a soft-deleted criterion
router.patch(
  "/class-rubric-criteria/:classRubricCriteriaId/restore",
  requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.restoreCriterion
);

// POST /class-rubric-criteria/reorder - Reorder multiple criteria (bulk update displayOrder)
router.post(
  "/class-rubric-criteria/reorder",
  requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.reorderCriteria
);

// POST /class-rubric-criteria/bulk-delete - Soft delete multiple criteria at once
router.post(
  "/class-rubric-criteria/bulk-delete",
  requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.bulkDeleteCriteria
);

// GET /classes/:classId/rubric/all - Get all class rubric criteria including inactive
router.get(
  "/:classId/rubric/all",
  requireRole(["Admin", "Instructor"]),
  classRubricCriteriaController.getAllClassRubricCriteria
);

export default router;