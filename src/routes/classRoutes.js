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
    '/',
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
    '/:classId',
    requireRole(['Admin', 'Instructor', 'Student']),
    classController.getClassById
);

router.put(
    '/:classId',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructor, // Check instructor is assigned to class
    validateUpdateClass,
    classController.updateClass
);


router.delete(
    '/:classId',
    requireRole(['Admin']),
    classController.deleteClass
);

router.post(
    '/:classId/instructors',
    requireRole(['Admin', 'Instructor']),
    validateAssignInstructor,
    classController.assignInstructor
);

router.delete(
    '/:classId/instructors/:instructorId',
    requireRole(['Admin', 'Instructor']),
    classController.removeInstructor
);

router.get(
    '/:classId/instructors',
    classController.getClassInstructors
);

export default router;
