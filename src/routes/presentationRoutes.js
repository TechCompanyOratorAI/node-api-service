import express from 'express';
import presentationController from '../controllers/presentationController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';
import { uploadSlide, uploadMedia, uploadErrorHandler } from '../middleware/uploadMiddleware.js';
import { validatePresentationCreate } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

// Create new presentation (student enrolled in topic)
router.post('/',
  generalRateLimit,
  validatePresentationCreate,
  presentationController.createPresentation
);

// Upload slide for a presentation
router.post('/:presentationId/slides',
  generalRateLimit,
  uploadSlide.single('file'),
  uploadErrorHandler,
  presentationController.uploadSlide
);

// Upload audio/video for a presentation
router.post('/:presentationId/media',
  generalRateLimit,
  uploadMedia.single('file'),
  uploadErrorHandler,
  presentationController.uploadMedia
);

// Submit presentation for processing
router.post('/:presentationId/submit',
  generalRateLimit,
  presentationController.submitPresentation
);

// Get presentation by ID
router.get('/:presentationId',
  generalRateLimit,
  presentationController.getPresentationById
);

// Get all presentations for current user
router.get('/',
  generalRateLimit,
  presentationController.getAllPresentations
);

// Update presentation
router.put('/:presentationId',
  generalRateLimit,
  presentationController.updatePresentation
);

// Delete presentation
router.delete('/:presentationId',
  generalRateLimit,
  presentationController.deletePresentation
);

// Get processing status
router.get('/:presentationId/status',
  generalRateLimit,
  presentationController.getProcessingStatus
);

// Get analysis results
router.get('/:presentationId/results',
  generalRateLimit,
  presentationController.getAnalysisResults
);

// Get presentations by course (for teachers)
router.get('/course/:courseId',
  generalRateLimit,
  presentationController.getPresentationsByCourse
);

export default router;
