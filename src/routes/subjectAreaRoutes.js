import express from "express";
import subjectAreaController from "../controllers/subjectAreaController.js";
import { authenticateToken, requireEmailVerification, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get("/", requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]), subjectAreaController.list);
router.get("/:id", requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]), subjectAreaController.getById);
router.post("/", requireRole(["Admin", "AcademicCoordinator"]), subjectAreaController.create);
router.patch("/:id", requireRole(["Admin", "AcademicCoordinator"]), subjectAreaController.update);
router.delete("/:id", requireRole(["Admin", "AcademicCoordinator"]), subjectAreaController.delete);

export default router;
