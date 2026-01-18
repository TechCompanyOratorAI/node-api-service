'use strict';
import userService from '../services/userService.js';

class UserController {
    async uploadAvatar(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy file avatar'
                });
            }

            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Người dùng chưa đăng nhập'
                });
            }

            const result = await userService.uploadAvatar(req.user.userId, req.file);

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(500).json(result);
            }

        } catch (error) {
            console.error('Upload avatar controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi upload avatar'
            });
        }
    }

    async getUserProfile(req, res) {
        try {
            const result = await userService.getUserProfile(req.user.userId);

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(result.success ? 200 : 404).json(result);
            }

        } catch (error) {
            console.error('Get user profile controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy thông tin người dùng'
            });
        }
    }

    async updateUserProfile(req, res) {
        try {
            const result = await userService.updateUserProfile(req.user.userId, req.body);

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(400).json(result);
            }

        } catch (error) {
            console.error('Update user profile controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật thông tin'
            });
        }
    }

    async getAllUsers(req, res) {
        try {
            const result = await userService.getAllUsers();

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(500).json(result);
            }

        } catch (error) {
            console.error('Get all users controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách người dùng'
            });
        }
    }

    async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const result = await userService.deleteUser(parseInt(userId));

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(result.success ? 200 : 404).json(result);
            }

        } catch (error) {
            console.error('Delete user controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa người dùng'
            });
        }
    }
}

export default new UserController();