'use strict';
import db from '../models/index.js';
import storageService from '../services/storageService.js';
import path from 'path';
import fs from 'fs';

const { User } = db;

const AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
]);

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

class UserController {
    async uploadAvatar(req, res) {
        try {
            console.log('Upload avatar request:', {
                hasFile: !!req.file,
                user: req.user,
                headers: req.headers.authorization ? 'Bearer token present' : 'No auth header'
            });

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

            const userId = req.user.userId;
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
            let avatarUrl;
            const isS3Configured = process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

            if (isS3Configured) {
                const key = `avatars/${userId}_${Date.now()}.${fileExtension}`;
                const uploadResult = await storageService.uploadBuffer({
                    key,
                    body: req.file.buffer,
                    contentType: req.file.mimetype
                });
                avatarUrl = uploadResult.url;
            } else {
                try {
                    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
                    if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                        console.log('Created uploads directory:', uploadsDir);
                    }

                    const filename = `${userId}_${Date.now()}.${fileExtension}`;
                    const filepath = path.join(uploadsDir, filename);

                    fs.writeFileSync(filepath, req.file.buffer);
                    avatarUrl = `/uploads/avatars/${filename}`;
                    console.log('File saved locally:', filepath);
                } catch (fileError) {
                    console.error('Local file save error:', fileError);
                    throw new Error('Không thể lưu file local');
                }
            }

            await user.update({
                avatar: avatarUrl
            });

            return res.json({
                success: true,
                message: 'Avatar đã được cập nhật thành công',
                data: {
                    avatarUrl: avatarUrl
                }
            });

        } catch (error) {
            console.error('Upload avatar error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                userId: req.user?.userId,
                hasFile: !!req.file
            });

            let errorMessage = 'Có lỗi xảy ra khi upload avatar';
            if (error.message.includes('AWS') || error.message.includes('S3')) {
                errorMessage = 'Lỗi upload file lên cloud storage';
            } else if (error.message.includes('database') || error.message.includes('SQL')) {
                errorMessage = 'Lỗi cập nhật database';
            }

            return res.status(500).json({
                success: false,
                message: errorMessage,
                debug: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    async getUserProfile(req, res) {
        try {
            const user = await User.findByPk(req.user.userId, {
                attributes: { exclude: ['passwordHash'] }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            return res.json({
                success: true,
                data: user
            });

        } catch (error) {
            console.error('Get user profile error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy thông tin người dùng'
            });
        }
    }

    async updateUserProfile(req, res) {
        try {
            const { firstName, lastName, dob, studyMajor, isCensored } = req.body;
            const userId = req.user.userId;

            const updateData = {};
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (dob !== undefined) updateData.dob = dob;
            if (studyMajor !== undefined) updateData.studyMajor = studyMajor;
            if (isCensored !== undefined) updateData.isCensored = isCensored;

            await User.update(updateData, { where: { userId } });

            return res.json({
                success: true,
                message: 'Thông tin cá nhân đã được cập nhật'
            });

        } catch (error) {
            console.error('Update user profile error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật thông tin'
            });
        }
    }

    async getAllUsers(req, res) {
        try {
            const users = await User.findAll({
                attributes: { exclude: ['passwordHash'] },
                include: [{
                    association: 'userRoles',
                    include: ['role']
                }]
            });

            return res.json({
                success: true,
                data: users
            });

        } catch (error) {
            console.error('Get all users error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách người dùng'
            });
        }
    }

    async deleteUser(req, res) {
        try {
            const { userId } = req.params;

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            await User.destroy({ where: { userId } });

            return res.json({
                success: true,
                message: 'Người dùng đã được xóa thành công'
            });

        } catch (error) {
            console.error('Delete user error:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa người dùng'
            });
        }
    }
}

export default new UserController();