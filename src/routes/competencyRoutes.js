"use strict";

const express = require("express");
const competencyController = require("../controllers/competencyController");
const {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get(
  "/competencies",
  requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]),
  competencyController.listCompetencies
);

router.post(
  "/competencies",
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.createCompetency
);

router.get(
  "/courses/:courseId/eligible-instructors",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  competencyController.getEligibleInstructors
);

router.post(
  "/instructors/:id/competencies",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  competencyController.declareInstructorCompetencies
);

router.get(
  "/instructors/:id/competencies",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  competencyController.getInstructorCompetencies
);

router.patch(
  "/instructor-competencies/:id/approve",
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.approveInstructorCompetency
);

router.delete(
  "/instructor-competencies/:id",
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.deleteInstructorCompetency
);

module.exports = router;
