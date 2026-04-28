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
        .withMessage('courseId phải là số nguyên dương'),
    body('classCode')
        .trim()
        .notEmpty()
        .withMessage('classCode là bắt buộc')
        .isLength({ min: 1, max: 50 })
        .withMessage('classCode phải từ 1 đến 50 ký tự')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('classCode chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới'),
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('startDate phải là ngày ISO hợp lệ'),
    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('endDate phải là ngày ISO hợp lệ')
        .custom((value, { req }) => {
            if (req.body.startDate && value) {
                const start = new Date(req.body.startDate);
                const end = new Date(value);
                if (end <= start) {
                    throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
                }
            }
            return true;
        }),
    body('maxStudents')
        .optional()
        .isInt({ min: 1 })
        .withMessage('maxStudents phải là số nguyên dương'),
    body('maxGroupMembers')
        .optional()
        .isInt({ min: 1 })
        .withMessage('maxGroupMembers phải là số nguyên dương'),
    body('academicBlockId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('academicBlockId phải là số nguyên dương'),
    body('academicBlockIds')
        .optional()
        .isArray({ min: 1 })
        .withMessage('academicBlockIds phải là mảng và có ít nhất 1 phần tử'),
    body('academicBlockIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Mỗi academicBlockId phải là số nguyên dương'),
    body('status')
    body().custom((value) => {
        if (value.academicBlockId !== undefined && value.academicBlockIds !== undefined) {
            throw new Error('Chi truyen academicBlockId hoac academicBlockIds, khong truyen ca hai');
        }
        return true;
    }),
        .optional()
        .isIn(['active', 'closed', 'archived'])
        .withMessage('status phải là active, closed hoặc archived'),
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
