"use strict";

const express = require("express");
const auditLogController = require("../controllers/auditLogController");
const {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get("/", requireRole(["Admin", "AcademicCoordinator"]), auditLogController.list);

module.exports = router;
