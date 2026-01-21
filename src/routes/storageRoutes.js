/**
 * Storage Routes
 */

import express from 'express';
import storageController from '../controllers/storageController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

// Generate presigned upload URL
router.post('/presigned-upload',
    generalRateLimit,
    storageController.getPresignedUploadUrl
);

// Generate presigned download URL
router.post('/presigned-download',
    generalRateLimit,
    storageController.getPresignedDownloadUrl
);

// Delete file
router.delete('/file',
    generalRateLimit,
    storageController.deleteFile
);

// Delete multiple files
router.post('/delete-multiple',
    generalRateLimit,
    storageController.deleteMultipleFiles
);

// Extract key from URL
router.post('/extract-key',
    generalRateLimit,
    storageController.extractKeyFromUrl
);

// Check file exists
router.post('/file-exists',
    generalRateLimit,
    storageController.fileExists
);

export default router;
