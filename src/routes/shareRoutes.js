import express from 'express';
import shareController from '../controllers/shareController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';
import { validateShareInvite } from '../middleware/validationMiddleware.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC endpoint (no authentication required)
// GET /share/:token
// Xem bài thuyết trình qua share link, trả về cả presentation + AI report
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:token', generalRateLimit, shareController.viewSharedPresentation);

export default router;
