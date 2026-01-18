import express from 'express';
import { authenticateToken, requireEmailVerification, requireRole } from '../middleware/authMiddleware.js';
import feedbackController from '../controllers/feedbackController.js';

const router = express.Router();

// All feedback routes require authentication
router.use(authenticateToken);
router.use(requireEmailVerification);

// Create feedback
router.post('/',
  feedbackController.createFeedback
);

// Get all feedback (admin only)
router.get('/',
  requireRole(['admin']),
  feedbackController.getAllFeedback
);

// Get feedback by ID
router.get('/:feedbackId',
  feedbackController.getFeedbackById
);

// Get feedback for a presentation
router.get('/presentation/:presentationId',
  feedbackController.getFeedbackByPresentation
);

// Get feedback given by current user
router.get('/my/feedback',
  feedbackController.getMyFeedback
);

// Update feedback (only reviewer can update their own feedback)
router.put('/:feedbackId',
  feedbackController.updateFeedback
);

// Delete feedback (only reviewer can delete their own feedback)
router.delete('/:feedbackId',
  feedbackController.deleteFeedback
);

export default router;