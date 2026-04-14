import express from 'express';
import instructorController from '../controllers/instructorController.js';
import { authenticateToken, requireEmailVerification, requireRole } from '../middleware/authMiddleware.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authenticateToken);
router.use(requireEmailVerification);
router.use(requireRole(['instructor', 'admin'])); // Chỉ instructor hoặc admin mới truy cập

// GET /api/instructor/presentations/pending - Danh sách chờ duyệt
router.get(
  '/presentations/pending',
  generalRateLimit,
  instructorController.getPendingApprovals
);

// GET /api/instructor/presentations/approved - Danh sách đã duyệt
router.get(
  '/presentations/approved',
  generalRateLimit,
  instructorController.getApprovedPresentations
);

// GET /api/instructor/presentations/:presentationId/approval-status - Lấy trạng thái duyệt
router.get(
  '/presentations/:presentationId/approval-status',
  generalRateLimit,
  instructorController.getApprovalStatus
);

// POST /api/instructor/presentations/:presentationId/approve - Duyệt submission
router.post(
  '/presentations/:presentationId/approve',
  generalRateLimit,
  instructorController.approveSubmission
);

// POST /api/instructor/presentations/:presentationId/unapprove - Huỷ duyệt
router.post(
  '/presentations/:presentationId/unapprove',
  generalRateLimit,
  instructorController.unapproveSubmission
);

export default router;
