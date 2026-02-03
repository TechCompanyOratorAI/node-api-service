import express from 'express';
import courseController from '../controllers/courseController.js';
import classController from '../controllers/classController.js';
import { authenticateToken, requireEmailVerification, requireRole } from '../middleware/authMiddleware.js';
import { requireCourseInstructor } from '../middleware/classAuthMiddleware.js';
import {
    validateCourse,
    validateCourseUpdate,
    validateTopic,
    validateTopicUpdate,
    validateAssignInstructor,
    validateCreateClass
} from '../middleware/validationMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Apply authentication to all course routes
router.use(authenticateToken);
router.use(requireEmailVerification);


router.post('/',
    requireRole(['Admin']),
    generalRateLimit,
    validateCourse,
    courseController.createCourse
);

router.get('/',
    courseController.getAllCourses
);

router.get('/my-courses',
    courseController.getMyCourses
);

router.get('/:courseId',
    courseController.getCourseById
);

router.patch('/:courseId',
    requireRole(['Admin']),
    validateCourseUpdate,
    courseController.updateCourse
);

router.delete('/:courseId',
    requireRole(['Admin']),
    courseController.deleteCourse
);

// Class management routes for course
router.post('/:courseId/classes',
    requireRole(['Admin', 'Instructor']),
    requireCourseInstructor,
    validateCreateClass,
    classController.createClass
);

router.get('/:courseId/classes',
    requireRole(['Admin', 'Instructor', 'Student']),
    classController.getClassesByCourse
);


router.post('/:courseId/topics',
    generalRateLimit,
    validateTopic,
    courseController.createTopic
);

// Get all topics for a course
router.get('/:courseId/topics',
    courseController.getTopicsByCourse
);

router.post('/:courseId/instructors',
    generalRateLimit,
    validateAssignInstructor,
    courseController.addCourseInstructor
);

router.delete('/:courseId/instructors/:instructorId',
    courseController.removeCourseInstructor
);

router.get('/:courseId/instructors',
    courseController.getCourseInstructors
);

router.get('/:courseId/available-instructors',
    requireRole(['Admin']),
    courseController.getAvailableInstructors
);

export default router;
