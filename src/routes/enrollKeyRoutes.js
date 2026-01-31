import express from 'express';
import enrollKeyController from '../controllers/enrollKeyController.js';
import {
    authenticateToken,
    requireEmailVerification,
    requireRole,
} from '../middleware/authMiddleware.js';
import { requireClassInstructorOrAdmin } from '../middleware/classAuthMiddleware.js';
import { validateCreateKey } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Apply authentication and email verification to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);


router.post(
    '/classes/:classId/enroll-key',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructorOrAdmin, // Admin bypasses, Instructor must be assigned to class
    validateCreateKey,
    enrollKeyController.createKey
);


router.post(
    '/classes/:classId/enroll-key/rotate',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructorOrAdmin,
    enrollKeyController.rotateKey
);


router.delete(
    '/enroll-keys/:keyId',
    requireRole(['Admin', 'Instructor']),
    enrollKeyController.revokeKey
);


router.get(
    '/classes/:classId/enroll-keys',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructorOrAdmin,
    enrollKeyController.getKeysByClass
);


router.post(
    '/enroll-keys/validate',
    requireRole(['Student']),
    enrollKeyController.validateKey
);

export default router;
