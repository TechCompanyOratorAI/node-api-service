'use strict';
const express = require('express');
const criterionFeedbackController = require('../controllers/aiReportFeedbackController');
const { authenticateToken, requireEmailVerification, requireRole } = require('../middleware/authMiddleware');
const {
  validateGetCriterionFeedbacks,
  validateCreateCriterionFeedback,
  validateUpsertCriterionFeedback,
  validateDeleteCriterionFeedback,
} = require('../middleware/validationMiddleware');
const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get(
  '/:reportId/criterion-feedbacks',
  requireRole(['Admin', 'Instructor', 'Student']),
  validateGetCriterionFeedbacks,
  criterionFeedbackController.getByReportId
);

router.post(
  '/:reportId/criterion-feedbacks',
  requireRole(['Admin', 'Instructor']),
  validateCreateCriterionFeedback,
  criterionFeedbackController.create
);

router.put(
  '/:reportId/criterion-feedbacks/:classRubricCriteriaId',
  requireRole(['Admin', 'Instructor']),
  validateUpsertCriterionFeedback,
  criterionFeedbackController.upsert
);

router.delete(
  '/:reportId/criterion-feedbacks/:classRubricCriteriaId',
  requireRole(['Admin', 'Instructor']),
  validateDeleteCriterionFeedback,
  criterionFeedbackController.delete
);

module.exports = router;
