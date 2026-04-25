import express from 'express';
import { body, param } from 'express-validator';
import courseController from '../controllers/courseController.js';
import classController from '../controllers/classController.js';
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

const validateCreateClassWithoutKey = [
    param('courseId')
        .isInt({ min: 1 })
        .withMessage('courseId must be a positive integer'),
    body('classCode')
        .trim()
        .notEmpty()
        .withMessage('classCode is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('classCode must be between 1 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('classCode can only contain letters, numbers, hyphens, and underscores'),
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('startDate must be a valid ISO date'),
    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('endDate must be a valid ISO date')
        .custom((value, { req }) => {
            if (req.body.startDate && value) {
                const start = new Date(req.body.startDate);
                const end = new Date(value);
                if (end <= start) {
                    throw new Error('endDate must be after startDate');
                }
            }
            return true;
        }),
    body('maxStudents')
        .optional()
        .isInt({ min: 1 })
        .withMessage('maxStudents must be a positive integer'),
    body('maxGroupMembers')
        .optional()
        .isInt({ min: 1 })
        .withMessage('maxGroupMembers must be a positive integer'),
    body('academicBlockId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('academicBlockId must be a positive integer'),
    body('status')
        .optional()
        .isIn(['active', 'closed', 'archived'])
        .withMessage('status must be active, closed, or archived'),
];

// Apply authentication to all course routes
router.use(authenticateToken);
router.use(requireEmailVerification);


router.post('/',
    requireRole(['Admin', 'AcademicCoordinator']),
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
    requireRole(['Admin', 'AcademicCoordinator']),
    validateCourseUpdate,
    courseController.updateCourse
);

router.delete('/:courseId',
    requireRole(['Admin', 'AcademicCoordinator']),
    courseController.deleteCourse
);

// Class management routes for course
router.post('/:courseId/classes',
    requireRole(['Admin', 'AcademicCoordinator']),
    validateCreateClassWithoutKey,
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
