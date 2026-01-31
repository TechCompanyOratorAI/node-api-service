import express from 'express';
import courseController from '../controllers/courseController.js';
import { authenticateToken, requireEmailVerification, requireRole } from '../middleware/authMiddleware.js';
import {
    validateCourse,
    validateCourseUpdate,
    validateTopic,
    validateTopicUpdate,
    validateAssignInstructor
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
    validateCourseUpdate,
    courseController.updateCourse
);

router.delete('/:courseId',
    courseController.deleteCourse
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
