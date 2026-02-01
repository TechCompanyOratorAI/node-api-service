import express from 'express';
import classController from '../controllers/classController.js';
import {
    authenticateToken,
    requireEmailVerification,
    requireRole,
} from '../middleware/authMiddleware.js';
import {
    requireCourseInstructor,
    requireClassInstructor,
} from '../middleware/classAuthMiddleware.js';
import {
    validateCreateClass,
    validateUpdateClass,
    validateAssignInstructor
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// Apply authentication and email verification to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// Get all classes (Admin only)
router.get(
    '/classes',
    requireRole(['Admin']),
    classController.getAllClasses
);

router.post(
    '/courses/:courseId/classes',
    requireRole(['Admin', 'Instructor']),
    requireCourseInstructor, // Check instructor is assigned to course
    validateCreateClass,
    classController.createClass
);


router.get(
    '/courses/:courseId/classes',
    requireRole(['Admin', 'Instructor']),
    classController.getClassesByCourse
);


router.get(
    '/classes/:classId',
    authenticateToken,
    requireEmailVerification,
    requireRole(['Admin', 'Instructor', 'Student']),
    classController.getClassById
);

router.put(
    '/classes/:classId',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructor, // Check instructor is assigned to class
    validateUpdateClass,
    classController.updateClass
);


router.delete(
    '/classes/:classId',
    requireRole(['Admin']),
    classController.deleteClass
);

router.post(
    '/classes/:classId/instructors',
    requireRole(['Admin', 'Instructor']),
    validateAssignInstructor,
    classController.assignInstructor
);

router.delete(
    '/classes/:classId/instructors/:instructorId',
    requireRole(['Admin', 'Instructor']),
    classController.removeInstructor
);

router.get(
    '/classes/:classId/instructors',
    classController.getClassInstructors
);

export default router;
