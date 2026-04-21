import express from 'express';
import transcriptController from '../controllers/transcriptController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /transcripts/presentation/:presentationId
// Lấy toàn bộ transcript (kèm segments) của một presentation
router.get(
    '/presentation/:presentationId',
    generalRateLimit,
    transcriptController.getByPresentation
);

// GET /transcripts/:transcriptId
// Lấy transcript theo transcriptId (kèm segments)
router.get(
    '/:transcriptId',
    generalRateLimit,
    transcriptController.getById
);

// GET /transcripts/:transcriptId/segments?page=1&limit=50
// Lấy danh sách segments có phân trang
router.get(
    '/:transcriptId/segments',
    generalRateLimit,
    transcriptController.getSegments
);

export default router;
