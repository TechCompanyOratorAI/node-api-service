/**
 * Job Routes
 */

import express from 'express';
import jobController from '../controllers/jobController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

// Get job statistics
router.get('/statistics',
    generalRateLimit,
    jobController.getJobStatistics
);

// Get pending jobs
router.get('/pending',
    generalRateLimit,
    jobController.getPendingJobs
);

// Get running jobs
router.get('/running',
    generalRateLimit,
    jobController.getRunningJobs
);

// Get jobs by presentation
router.get('/presentation/:presentationId',
    generalRateLimit,
    jobController.getJobsByPresentation
);

// Get job history
router.get('/presentation/:presentationId/history',
    generalRateLimit,
    jobController.getJobHistory
);

// Get job by ID
router.get('/:jobId',
    generalRateLimit,
    jobController.getJobById
);

// Retry failed job
router.post('/:jobId/retry',
    generalRateLimit,
    jobController.retryJob
);

// Cleanup old jobs (admin only - add admin middleware later)
router.post('/cleanup',
    generalRateLimit,
    jobController.cleanupOldJobs
);

// Reset stuck jobs (admin only - add admin middleware later)
router.post('/reset-stuck',
    generalRateLimit,
    jobController.resetStuckJobs
);

export default router;
