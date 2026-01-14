import express from 'express';
import courseController from '../controllers/courseController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { validateTopicUpdate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Apply authentication to all topic routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// ============================================
// STANDALONE TOPIC ROUTES
// ============================================

// Get specific topic by ID
router.get('/:topicId',
    courseController.getTopicById
);

// Update topic (instructor only)
router.patch('/:topicId',
    validateTopicUpdate,
    courseController.updateTopic
);

// Delete topic (instructor only)
router.delete('/:topicId',
    courseController.deleteTopic
);

export default router;
