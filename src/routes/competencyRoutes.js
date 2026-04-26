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

router.post(
  "/courses/:courseId/competency-requirements",
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.setCourseRequirements
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

router.patch(
  "/instructor-competencies/:id/approve",
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.approveInstructorCompetency
);

module.exports = router;

