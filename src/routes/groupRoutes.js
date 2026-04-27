const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const groupGradeDistributionController = require('../controllers/groupGradeDistributionController');
const { authenticateToken, requireEmailVerification } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

// Tất cả routes cần xác thực
router.use(authenticateToken);
router.use(requireEmailVerification);

router.get('/classes/:classId', groupController.getGroupsByClass);
router.get('/classes/:classId/my-group', groupController.getMyGroupInClass);
router.get('/my', groupController.getMyGroups);
router.post('/', groupController.createGroup);

// [POST] /api/groups/classes/:classId/auto-assign - Phân nhóm tự động (Instructor/Admin only)
router.post('/classes/:classId/auto-assign', requireRole(['Admin', 'Instructor']), groupController.autoAssignGroups);

router.get('/:groupId', groupController.getGroupById);
router.post('/:groupId/join', groupController.joinGroup);
router.post('/:groupId/leave', groupController.leaveGroup);
// [PUT] /api/groups/:groupId - Cập nhật nhóm (chỉ leader)
router.put('/:groupId', groupController.updateGroup);
router.patch('/:groupId', groupController.updateGroup);
// [DELETE] /api/groups/:groupId - Xóa nhóm (chỉ leader)
router.delete('/:groupId', groupController.deleteGroup);
// [POST] /api/groups/:groupId/members/:studentId/remove - Xóa thành viên (chỉ leader)
router.post('/:groupId/members/:studentId/remove', groupController.removeMember);
// [POST] /api/groups/:groupId/members/:studentId/promote - Chuyển quyền leader (chỉ Admin/Instructor)
router.post('/:groupId/members/:studentId/promote', requireRole(["Admin", "Instructor"]), groupController.promoteMember);

// ============================================================
// TOPIC SELECTION ROUTES
// ============================================================
// [POST]   /api/groups/:groupId/topic - Nhóm trưởng chọn topic cho nhóm
router.post('/:groupId/topic', groupController.selectGroupTopic);
// [GET]    /api/groups/:groupId/topic - Lấy topic hiện tại của nhóm
router.get('/:groupId/topic', groupController.getGroupTopic);
// [DELETE] /api/groups/:groupId/topic - Huỷ chọn topic (leader only)
router.delete('/:groupId/topic', groupController.removeGroupTopic);

// ============================================================
// GRADE DISTRIBUTION ROUTES
// ============================================================
// [GET]    /api/groups/:groupId/grade-distributions - Lấy tất cả phân chia điểm của nhóm
router.get('/:groupId/grade-distributions', groupGradeDistributionController.getDistributionsByGroup);
// [GET]    /api/groups/:groupId/members/:studentId/grades - Lấy điểm cá nhân của thành viên trong nhóm
router.get('/:groupId/members/:studentId/grades', groupGradeDistributionController.getMemberGradesInGroup);
// [POST]   /api/groups/:groupId/grade-distributions/:distributionId/feedback - Thành viên phản hồi
router.post('/:groupId/grade-distributions/:distributionId/feedback', groupGradeDistributionController.submitMemberFeedback);
// [PUT]    /api/groups/:groupId/grade-distributions/:distributionId/reopen - Instructor mở lại
router.put('/:groupId/grade-distributions/:distributionId/reopen', groupGradeDistributionController.reopenDistribution);
// [PUT]    /api/groups/:groupId/grade-distributions/:distributionId/finalize - Instructor chốt điểm
router.put('/:groupId/grade-distributions/:distributionId/finalize', groupGradeDistributionController.finalizeDistribution);

module.exports = router;
