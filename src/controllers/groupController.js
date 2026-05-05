const groupService = require('../services/groupService');
const { emitGroupAutoAssignedEvent } = require('../websocket/emitters');

// Lấy thông tin user hiện tại từ request
const getCurrentUser = (req) => {
    return req.user || req.session?.user || JSON.parse(req.headers['x-user'] || '{}');
};

// [POST] /api/groups - Tạo nhóm mới
const createGroup = async (req, res) => {
    try {
        const { classId, groupName, description } = req.body;
        const currentUser = getCurrentUser(req);

        if (!classId || !groupName) {
            return res.status(400).json({ error: 'classId và groupName là bắt buộc' });
        }

        const result = await groupService.createGroup(classId, groupName, description, currentUser.userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.status(201).json({
            message: result.message,
            group: result.group
        });

    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [POST] /api/groups/:groupId/join - Tham gia nhóm
const joinGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.joinGroup(groupId, currentUser.userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.status(201).json({
            message: result.message,
            student: result.student,
            memberCount: result.memberCount
        });

    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [POST] /api/groups/:groupId/leave - Rời nhóm
const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.leaveGroup(groupId, currentUser.userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({ message: result.message });

    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [POST] /api/groups/:groupId/members/:studentId/remove - Xóa thành viên (chỉ leader)
const removeMember = async (req, res) => {
    try {
        const { groupId, studentId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.removeMember(groupId, parseInt(studentId), currentUser.userId);

        if (!result.success) {
            return res.status(403).json({ error: result.message });
        }

        res.json({ message: result.message });

    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [POST] /api/groups/:groupId/members/:studentId/promote - Chuyển quyền leader
const promoteMember = async (req, res) => {
    try {
        const { groupId, studentId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.promoteMember(groupId, parseInt(studentId), currentUser.userId);

        if (!result.success) {
            return res.status(403).json({ error: result.message });
        }

        res.json({
            message: result.message,
            newLeaderId: result.newLeaderId
        });

    } catch (error) {
        console.error('Promote member error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [POST] /api/groups/:groupId - Cập nhật thông tin nhóm (chỉ leader)
const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { groupName, description } = req.body;
        const currentUser = getCurrentUser(req);

        const result = await groupService.updateGroup(groupId, { groupName, description }, currentUser.userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({
            message: result.message,
            group: result.group
        });

    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [DELETE] /api/groups/:groupId - Xóa nhóm (chỉ leader)
const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.deleteGroup(groupId, currentUser.userId);

        if (!result.success) {
            return res.status(403).json({ error: result.message });
        }

        res.json({ message: result.message });

    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [GET] /api/classes/:classId/groups - Lấy danh sách nhóm trong lớp
const getGroupsByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.getGroupsByClass(classId, currentUser.userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json(result.data);

    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [GET] /api/groups/:groupId - Lấy chi tiết nhóm
const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.getGroupById(groupId, currentUser.userId);

        if (!result.success) {
            return res.status(404).json({ error: result.message });
        }

        res.json({ group: result.data });

    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [GET] /api/groups/classes/:classId/my-group - Lấy nhóm của tôi trong lớp
const getMyGroupInClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.getMyGroupInClass(classId, currentUser.userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        if (!result.data) {
            return res.status(200).json({
                success: true,
                group: null,
                message: result.message
            });
        }

        res.json({
            group: result.data
        });

    } catch (error) {
        console.error('Get my group in class error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [GET] /api/my/groups - Lấy danh sách nhóm của user hiện tại
const getMyGroups = async (req, res) => {
    try {
        const currentUser = getCurrentUser(req);

        const result = await groupService.getMyGroups(currentUser.userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({ groups: result.data });

    } catch (error) {
        console.error('Get my groups error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [POST] /api/groups/:groupId/topic - Nhóm trưởng chọn topic cho nhóm
const selectGroupTopic = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { topicId } = req.body;
        const currentUser = getCurrentUser(req);

        if (!topicId) {
            return res.status(400).json({ error: 'topicId là bắt buộc' });
        }

        const result = await groupService.selectGroupTopic(
            parseInt(groupId),
            parseInt(topicId),
            currentUser.userId
        );

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.status(200).json({ message: result.message, data: result.data });

    } catch (error) {
        console.error('Select group topic error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [GET] /api/groups/:groupId/topic - Lấy topic hiện tại của nhóm
const getGroupTopic = async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.getGroupTopic(
            parseInt(groupId),
            currentUser.userId
        );

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({ topic: result.data, message: result.message });

    } catch (error) {
        console.error('Get group topic error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [DELETE] /api/groups/:groupId/topic - Huỷ chọn topic (leader only)
const removeGroupTopic = async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUser = getCurrentUser(req);

        const result = await groupService.removeGroupTopic(
            parseInt(groupId),
            currentUser.userId
        );

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({ message: result.message });

    } catch (error) {
        console.error('Remove group topic error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// [POST] /api/groups/classes/:classId/auto-assign - Phân nhóm tự động (Instructor/Admin)
const autoAssignGroups = async (req, res) => {
    try {
        const { classId } = req.params;
        const { strategy, value, namePrefix, resetExisting } = req.body;
        const currentUser = getCurrentUser(req);
        const userRole = req.userRoles?.includes('Admin') ? 'Admin'
            : req.userRoles?.includes('Instructor') ? 'Instructor' : 'Student';

        if (!strategy || !value) {
            return res.status(400).json({
                success: false,
                message: 'strategy và value là bắt buộc'
            });
        }

        const result = await groupService.autoAssignGroups(
            parseInt(classId),
            { strategy, value: parseInt(value), namePrefix, resetExisting: Boolean(resetExisting) },
            currentUser.userId,
            userRole
        );

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });

        await emitGroupAutoAssignedEvent({
            actorUserId: currentUser.userId,
            classId: parseInt(classId),
            ...result.data,
            message: result.message,
        });

    } catch (error) {
        console.error('Auto-assign groups error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

module.exports = {
    createGroup,
    joinGroup,
    leaveGroup,
    removeMember,
    promoteMember,
    updateGroup,
    deleteGroup,
    getGroupsByClass,
    getGroupById,
    getMyGroupInClass,
    getMyGroups,
    selectGroupTopic,
    getGroupTopic,
    removeGroupTopic,
    autoAssignGroups,
};
