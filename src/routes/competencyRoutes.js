"use strict";

const express = require("express");
const competencyController = require("../controllers/competencyController");
const {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/competencies",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]),
  competencyController.listCompetencies
);

router.post(
  "/competencies",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.createCompetency
);

router.get(
  "/courses/:courseId/eligible-instructors",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  competencyController.getEligibleInstructors
);

router.post(
  "/instructors/:id/competencies",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  competencyController.declareInstructorCompetencies
);

router.get(
  "/instructors/:id/competencies",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  competencyController.getInstructorCompetencies
);

router.patch(
  "/instructor-competencies/:id/approve",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.approveInstructorCompetency
);

router.delete(
  "/instructor-competencies/:id",
  authenticateToken,
  requireEmailVerification,
  requireRole(["Admin", "AcademicCoordinator"]),
  competencyController.deleteInstructorCompetency
);

module.exports = router;
