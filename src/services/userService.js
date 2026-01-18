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

class UserService {
    async uploadAvatar(userId, file) {
        try {
            // Check user exists
            const user = await User.findByPk(userId);
            if (!user) {
                return {
                    success: false,
                    message: 'Không tìm thấy người dùng'
                };
            }

            const fileExtension = file.originalname.split('.').pop().toLowerCase();
            let avatarUrl;
            const isS3Configured = process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

            if (isS3Configured) {
                // Upload to S3
                const key = `avatars/${userId}_${Date.now()}.${fileExtension}`;
                const uploadResult = await storageService.uploadBuffer({
                    key,
                    body: file.buffer,
                    contentType: file.mimetype
                });
                avatarUrl = uploadResult.url;
            } else {
                // Store locally
                try {
                    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
                    if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                        console.log('Created uploads directory:', uploadsDir);
                    }

                    const filename = `${userId}_${Date.now()}.${fileExtension}`;
                    const filepath = path.join(uploadsDir, filename);

                    fs.writeFileSync(filepath, file.buffer);
                    avatarUrl = `/uploads/avatars/${filename}`;
                    console.log('File saved locally:', filepath);
                } catch (fileError) {
                    console.error('Local file save error:', fileError);
                    throw new Error('Không thể lưu file local');
                }
            }

            // Update DB
            await user.update({
                avatar: avatarUrl
            });

            return {
                success: true,
                message: 'Avatar đã được cập nhật thành công',
                data: {
                    avatarUrl: avatarUrl
                }
            };

        } catch (error) {
            console.error('Upload avatar service error:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi upload avatar'
            };
        }
    }

    async getUserProfile(userId) {
        try {
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['passwordHash'] }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'Không tìm thấy người dùng'
                };
            }

            return {
                success: true,
                data: user
            };

        } catch (error) {
            console.error('Get user profile service error:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi lấy thông tin người dùng'
            };
        }
    }

    async updateUserProfile(userId, updateData) {
        try {
            const { firstName, lastName, dob, studyMajor, isCensored } = updateData;

            const dataToUpdate = {};
            if (firstName !== undefined) dataToUpdate.firstName = firstName;
            if (lastName !== undefined) dataToUpdate.lastName = lastName;
            if (dob !== undefined) dataToUpdate.dob = dob;
            if (studyMajor !== undefined) dataToUpdate.studyMajor = studyMajor;
            if (isCensored !== undefined) dataToUpdate.isCensored = isCensored;

            const [affectedRows] = await User.update(dataToUpdate, { where: { userId } });

            if (affectedRows === 0) {
                return {
                    success: false,
                    message: 'Không tìm thấy người dùng hoặc không có thay đổi'
                };
            }

            return {
                success: true,
                message: 'Thông tin cá nhân đã được cập nhật'
            };

        } catch (error) {
            console.error('Update user profile service error:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật thông tin'
            };
        }
    }

    async getAllUsers() {
        try {
            const users = await User.findAll({
                attributes: { exclude: ['passwordHash'] },
                include: [{
                    association: 'userRoles',
                    include: ['role']
                }]
            });

            return {
                success: true,
                data: users
            };

        } catch (error) {
            console.error('Get all users service error:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách người dùng'
            };
        }
    }

    async deleteUser(userId) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                return {
                    success: false,
                    message: 'Không tìm thấy người dùng'
                };
            }

            await User.destroy({ where: { userId } });

            return {
                success: true,
                message: 'Người dùng đã được xóa thành công'
            };

        } catch (error) {
            console.error('Delete user service error:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa người dùng'
            };
        }
    }
}

export default new UserService();