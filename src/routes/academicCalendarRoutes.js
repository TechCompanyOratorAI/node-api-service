"use strict";

const express = require("express");
const academicCalendarController = require("../controllers/academicCalendarController");
const {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get("/years", requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]), academicCalendarController.listAcademicYears);
router.post("/years", requireRole(["Admin", "AcademicCoordinator"]), academicCalendarController.createAcademicYear);
router.patch("/years/:academicYearId", requireRole(["Admin", "AcademicCoordinator"]), academicCalendarController.updateAcademicYear);
router.delete("/years/:academicYearId", requireRole(["Admin", "AcademicCoordinator"]), academicCalendarController.deleteAcademicYear);

router.get("/blocks/current", requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]), academicCalendarController.getCurrentAcademicBlock);
router.get("/blocks", requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]), academicCalendarController.listAcademicBlocks);
router.post("/blocks", requireRole(["Admin", "AcademicCoordinator"]), academicCalendarController.createAcademicBlock);
router.post("/blocks/bulk", requireRole(["Admin", "AcademicCoordinator"]), academicCalendarController.createAcademicBlocksBulk);
router.patch("/blocks/:academicBlockId", requireRole(["Admin", "AcademicCoordinator"]), academicCalendarController.updateAcademicBlock);
router.delete("/blocks/:academicBlockId", requireRole(["Admin", "AcademicCoordinator"]), academicCalendarController.deleteAcademicBlock);

module.exports = router;
