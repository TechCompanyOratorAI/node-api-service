/**
 * Speaker Routes
 */

import express from 'express';
import speakerController from '../controllers/speakerController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

// Get speakers by presentation
router.get('/presentation/:presentationId',
    generalRateLimit,
    speakerController.getSpeakersByPresentation
);

// Get speaker statistics
router.get('/statistics/:presentationId',
    generalRateLimit,
    speakerController.getSpeakerStatistics
);

// Get student speaker summary
router.get('/student/:studentId/summary',
    generalRateLimit,
    speakerController.getStudentSpeakerSummary
);

// Get speaker mapping suggestions
router.get('/presentation/:presentationId/suggestions',
    generalRateLimit,
    speakerController.suggestStudentMappings
);

// Get speaker by ID
router.get('/:speakerId',
    generalRateLimit,
    speakerController.getSpeakerById
);

// Map speaker to student
router.post('/:speakerId/map',
    generalRateLimit,
    speakerController.mapSpeakerToStudent
);

// Unmap speaker
router.post('/:speakerId/unmap',
    generalRateLimit,
    speakerController.unmapSpeaker
);

// Batch map speakers
router.post('/batch-map',
    generalRateLimit,
    speakerController.batchMapSpeakers
);

// Delete speaker
router.delete('/:speakerId',
    generalRateLimit,
    speakerController.deleteSpeaker
);

export default router;
