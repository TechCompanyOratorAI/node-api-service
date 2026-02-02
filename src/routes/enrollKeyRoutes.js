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


// [POST] /enroll-keys - Create enroll key for class
router.post(
    '/',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructorOrAdmin,
    validateCreateKey,
    enrollKeyController.createKey
);


// [GET] /enroll-keys - Get all enroll keys (Admin only)
router.get(
    '/',
    requireRole(['Admin']),
    enrollKeyController.getAllKeys
);


// [POST] /enroll-keys/:classId/rotate - Rotate enroll key
router.post(
    '/:classId/rotate',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructorOrAdmin,
    enrollKeyController.rotateKey
);


// [DELETE] /enroll-keys/:keyId - Revoke enroll key
router.delete(
    '/:keyId',
    requireRole(['Admin', 'Instructor']),
    enrollKeyController.revokeKey
);


// [GET] /enroll-keys/:classId - Get all enroll keys for class
router.get(
    '/:classId',
    requireRole(['Admin', 'Instructor']),
    requireClassInstructorOrAdmin,
    enrollKeyController.getKeysByClass
);


// [POST] /enroll-keys/validate - Validate enroll key (Student)
router.post(
    '/validate',
    requireRole(['Student']),
    enrollKeyController.validateKey
);

export default router;
