import express from 'express';
import shareController from '../controllers/shareController.js';
import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';
import { validateShareInvite } from '../middleware/validationMiddleware.js';

const router = express.Router({ mergeParams: true });

// All routes here are protected (owner only)
router.use(authenticateToken, requireEmailVerification);

// GET /presentations/:presentationId/share
// Lấy danh sách tất cả share records
router.get('/', generalRateLimit, shareController.getShareList);

// POST /presentations/:presentationId/share/public
// Tạo hoặc lấy public share link
router.post('/public', generalRateLimit, shareController.createPublicShare);

// DELETE /presentations/:presentationId/share/public
// Thu hồi public share link
router.delete('/public', generalRateLimit, shareController.revokePublicShare);

// POST /presentations/:presentationId/share/invite
// Mời người dùng bằng email (private share)
router.post('/invite', generalRateLimit, validateShareInvite, shareController.inviteByEmails);

// DELETE /presentations/:presentationId/share/invite/:accessId
// Thu hồi quyền của một access record theo accessId
router.delete('/invite/:accessId', generalRateLimit, shareController.revokePrivateShare);

export default router;
