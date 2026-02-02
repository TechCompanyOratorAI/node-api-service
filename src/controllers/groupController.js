const groupService = require('../services/groupService');

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
    getMyGroups
};
