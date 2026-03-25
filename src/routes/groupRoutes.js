const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken, requireEmailVerification } = require('../middleware/authMiddleware');

// Tất cả routes cần xác thực
router.use(authenticateToken);
router.use(requireEmailVerification);

router.get('/classes/:classId', groupController.getGroupsByClass);
router.get('/classes/:classId/my-group', groupController.getMyGroupInClass);
router.get('/my', groupController.getMyGroups);
router.post('/', groupController.createGroup);
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
// [POST] /api/groups/:groupId/members/:studentId/promote - Chuyển quyền leader (chỉ leader)
router.post('/:groupId/members/:studentId/promote', groupController.promoteMember);

// ============================================================
// TOPIC SELECTION ROUTES
// ============================================================
// [POST]   /api/groups/:groupId/topic - Nhóm trưởng chọn topic cho nhóm
router.post('/:groupId/topic', groupController.selectGroupTopic);
// [GET]    /api/groups/:groupId/topic - Lấy topic hiện tại của nhóm
router.get('/:groupId/topic', groupController.getGroupTopic);
// [DELETE] /api/groups/:groupId/topic - Huỷ chọn topic (leader only)
router.delete('/:groupId/topic', groupController.removeGroupTopic);

module.exports = router;
