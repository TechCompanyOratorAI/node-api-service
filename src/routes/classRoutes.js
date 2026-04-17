import express from "express";
import classController from "../controllers/classController.js";
import classScoreController from "../controllers/classScoreController.js";
import enrollmentController from "../controllers/enrollmentController.js";
import enrollKeyController from "../controllers/enrollKeyController.js";
import groupGradeDistributionController from "../controllers/groupGradeDistributionController.js";
import {
  authenticateToken,
  requireEmailVerification,
  requireRole,
} from "../middleware/authMiddleware.js";
import {
  requireCourseInstructor,
  requireClassInstructor,
  requireClassInstructorOrAdmin,
} from "../middleware/classAuthMiddleware.js";
import {
  validateCreateClass,
  validateUpdateClass,
  validateAssignInstructor,
  validateCreateKey,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply authentication and email verification to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// Get all classes (Admin and Student)
router.get(
  "/",
  requireRole(["Admin", "Student"]),
  classController.getAllClasses
);

router.get(
  "/:classId",
  requireRole(["Admin", "Instructor", "Student"]),
  classController.getClassById
);

router.put(
  "/:classId",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructorOrAdmin,
  validateUpdateClass,
  classController.updateClass
);

router.delete("/:classId", requireRole(["Admin"]), classController.deleteClass);

router.post(
  "/:classId/instructors",
  requireRole(["Admin", "Instructor"]),
  validateAssignInstructor,
  classController.assignInstructor
);

router.delete(
  "/:classId/instructors/:instructorId",
  requireRole(["Admin", "Instructor"]),
  classController.removeInstructor
);

router.get("/:classId/instructors", classController.getClassInstructors);

router.get(
  "/:classId/students",
  requireRole(["Admin", "Instructor"]),
  enrollmentController.getClassStudents
);

// Class scores - get all students and their scores (Instructor/Admin)
router.get(
  "/:classId/scores",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructorOrAdmin,
  classScoreController.getClassScores
);

// Group grade distributions - get all grade distributions for all groups in a class (Instructor)
router.get(
  "/:classId/group-grade-distributions",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructorOrAdmin,
  groupGradeDistributionController.getGradeDistributionsByClass
);

// Enrollment key management
router.post(
  "/:classId/enroll-key",
  requireRole(["Admin", "Instructor"]),
  // requireClassInstructorOrAdmin, // Temporarily disabled
  // validateCreateKey, // Temporarily disabled for testing
  enrollKeyController.createKey
);

router.get(
  "/:classId/enroll-keys",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructorOrAdmin,
  enrollKeyController.getKeysByClass
);

router.post(
  "/:classId/enroll-key/rotate",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructorOrAdmin,
  enrollKeyController.rotateKey
);

// Student leave class
router.delete(
  "/:classId/leave",
  requireRole(["Student"]),
  enrollmentController.leaveClass
);

// ============================================================
// TOPIC ROUTES (per-class)
// ============================================================
// POST   /api/classes/:classId/topics  - tạo topic cho lớp (Instructor/Admin)
router.post(
  "/:classId/topics",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructor,
  classController.createTopic
);

// GET    /api/classes/:classId/topics  - lấy danh sách topic của lớp
router.get(
  "/:classId/topics",
  requireRole(["Admin", "Instructor", "Student"]),
  classController.getTopicsByClass
);

// PATCH  /api/classes/topics/:topicId  - update topic
router.patch(
  "/topics/:topicId",
  requireRole(["Admin", "Instructor"]),
  classController.updateTopic
);

// DELETE /api/classes/topics/:topicId  - xóa topic
router.delete(
  "/topics/:topicId",
  requireRole(["Admin", "Instructor"]),
  classController.deleteTopic
);

// ============================================================
// UPLOAD PERMISSION ROUTES
// ============================================================
// GET  /api/classes/:classId/upload-permission - Lấy trạng thái upload
router.get(
  "/:classId/upload-permission",
  authenticateToken,
  requireEmailVerification,
  classController.getUploadPermission
);

// POST /api/classes/:classId/upload-permission - Bật/tắt upload
router.post(
  "/:classId/upload-permission",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructorOrAdmin,
  classController.setUploadPermission
);

export default router;
