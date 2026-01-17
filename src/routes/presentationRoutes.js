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

export default router;
