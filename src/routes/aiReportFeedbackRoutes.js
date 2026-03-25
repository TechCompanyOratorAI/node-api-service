'use strict';
const express = require('express');
const aiReportFeedbackController = require('../controllers/aiReportFeedbackController');
const { authenticateToken, requireEmailVerification, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);
// POST /ai-reports/:reportId/feedback - Tạo/cập nhật feedback
router.post(
  '/:reportId/feedback',
  requireRole(['Admin', 'Instructor']),
  aiReportFeedbackController.createOrUpdateFeedback
);

// GET /ai-reports/:reportId/feedback - Lấy feedback của một report
router.get(
  '/:reportId/feedback',
  requireRole(['Admin', 'Instructor', 'Student']),
  aiReportFeedbackController.getFeedbackByReportId
);

// DELETE /ai-reports/:reportId/feedback - Xóa feedback
router.delete(
  '/:reportId/feedback',
  requireRole(['Admin', 'Instructor']),
  aiReportFeedbackController.deleteFeedback
);

// PATCH /ai-reports/:reportId/feedback/visibility - Toggle visibility
router.patch(
  '/:reportId/feedback/visibility',
  requireRole(['Admin', 'Instructor']),
  aiReportFeedbackController.toggleVisibility
);

module.exports = router;
