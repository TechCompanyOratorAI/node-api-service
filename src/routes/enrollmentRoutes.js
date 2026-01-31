import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';
import { authenticateToken, requireEmailVerification, requireRole } from '../middleware/authMiddleware.js';
import { validateJoinClass } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Apply authentication and email verification to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

router.post(
    '/join',
    requireRole(['Student']),
    validateJoinClass,
    enrollmentController.joinClass
);

router.get(
    '/me/classes',
    requireRole(['Student']),
    enrollmentController.getMyClasses
);

router.delete(
    '/classes/:classId/leave',
    requireRole(['Student']),
    enrollmentController.leaveClass
);

router.get(
    '/classes/:classId/students',
    requireRole(['Admin', 'Instructor']),
    enrollmentController.getClassStudents
);

router.post(
    '/topics/:topicId',
    requireRole(['Student']),
    enrollmentController.enrollTopic
);

router.delete(
    '/topics/:topicId',
    requireRole(['Student']),
    enrollmentController.dropTopic
);

router.get(
    '/me/topics',
    requireRole(['Student']),
    enrollmentController.listMyTopics
);

export default router;

