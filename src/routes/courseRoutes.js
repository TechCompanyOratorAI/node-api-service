import express from 'express';
import courseController from '../controllers/courseController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import {
    validateCourse,
    validateCourseUpdate,
    validateTopic,
    validateTopicUpdate
} from '../middleware/validationMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Apply authentication to all course routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// ============================================
// COURSE ROUTES
// ============================================

// Create new course (instructor only)
router.post('/',
    generalRateLimit,
    validateCourse,
    courseController.createCourse
);

// Get all courses with filters and pagination
// Query params: instructorId, semester, academicYear, isActive, search, page, limit, sortBy, sortOrder
router.get('/',
    courseController.getAllCourses
);

// Get specific course by ID
// Query params: includeStats=true (optional)
router.get('/:courseId',
    courseController.getCourseById
);

// Update course (instructor only)
router.patch('/:courseId',
    validateCourseUpdate,
    courseController.updateCourse
);

// Delete course (instructor only - soft delete if has presentations)
router.delete('/:courseId',
    courseController.deleteCourse
);

// ============================================
// TOPIC ROUTES (nested under course)
// ============================================

// Create new topic for a course (instructor only)
router.post('/:courseId/topics',
    generalRateLimit,
    validateTopic,
    courseController.createTopic
);

// Get all topics for a course
router.get('/:courseId/topics',
    courseController.getTopicsByCourse
);

export default router;
