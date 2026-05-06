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
  validateTopic,
  validateTopicUpdate,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply authentication and email verification to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// Get all classes (Admin and Student)
router.get(
  "/",
  requireRole(["Admin", "AcademicCoordinator", "Student"]),
  classController.getAllClasses
);

router.get(
  "/:classId",
  requireRole(["Admin", "AcademicCoordinator", "Instructor", "Student"]),
  classController.getClassById
);

router.put(
  "/:classId",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  requireClassInstructorOrAdmin,
  validateUpdateClass,
  classController.updateClass
);

router.delete("/:classId", requireRole(["Admin", "AcademicCoordinator"]), classController.deleteClass);

router.post(
  "/:classId/instructors",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  validateAssignInstructor,
  classController.assignInstructor
);

router.delete(
  "/:classId/instructors/:instructorId",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  classController.removeInstructor
);

router.get("/:classId/instructors", classController.getClassInstructors);

router.get(
  "/:classId/students",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
  enrollmentController.getClassStudents
);

// Class scores - get all students and their scores (Instructor/Admin)
router.get(
  "/:classId/scores",
  requireRole(["Admin", "AcademicCoordinator", "Instructor"]),
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
  validateTopic,
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
  validateTopicUpdate,
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

// ============================================================
// EMAIL WHITELIST ROUTES
// ============================================================
// GET  /api/classes/:classId/email-whitelist - Lấy danh sách email
router.get(
  "/:classId/email-whitelist",
  requireRole(["Admin", "Instructor"]),
  classController.getClassEmailWhitelist
);

// POST /api/classes/:classId/email-whitelist - Upload Excel, replace whitelist
router.post(
  "/:classId/email-whitelist",
  requireRole(["Admin", "Instructor"]),
  classController.uploadClassEmailWhitelist
);

// DELETE /api/classes/:classId/email-whitelist - Xóa toàn bộ whitelist
router.delete(
  "/:classId/email-whitelist",
  requireRole(["Admin", "Instructor"]),
  classController.deleteClassEmailWhitelist
);

// POST /api/classes/:classId/email-whitelist/add - Thêm lẻ 1 email
router.post(
  "/:classId/email-whitelist/add",
  requireRole(["Admin", "Instructor"]),
  classController.addSingleEmailToWhitelist
);

// PATCH /api/classes/:classId/email-whitelist/update - Sửa 1 email
router.patch(
  "/:classId/email-whitelist/update",
  requireRole(["Admin", "Instructor"]),
  classController.updateSingleEmailInWhitelist
);

// DELETE /api/classes/:classId/email-whitelist/single - Xóa 1 email + kick sinh viên
router.delete(
  "/:classId/email-whitelist/single",
  requireRole(["Admin", "Instructor"]),
  classController.removeSingleEmailFromWhitelist
);

// ============================================================
// RESUBMIT SETTING ROUTES
// ============================================================
// GET  /api/classes/:classId/resubmit-setting - Lấy cài đặt số lần nộp
router.get(
  "/:classId/resubmit-setting",
  authenticateToken,
  requireEmailVerification,
  classController.getResubmitSetting
);

// POST /api/classes/:classId/resubmit-setting - Cài đặt số lần nộp tối đa
router.post(
  "/:classId/resubmit-setting",
  requireRole(["Admin", "Instructor"]),
  requireClassInstructorOrAdmin,
  classController.setResubmitSetting
);

export default router;
