'use strict';

const { validationResult } = require('express-validator');
const enrollKeyService = require('../services/enrollKeyService');

class EnrollKeyController {
    // Create enrollment key
    async createKey(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            // Get classId from URL params
            const { classId } = req.params;
            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'classId là bắt buộc'
                });
            }

            const userId = req.user.userId;
            const userRole = req.userRoles?.includes('Admin') ? 'Admin' :
                req.userRoles?.includes('Instructor') ? 'Instructor' : 'Student';

            // Debug log
            console.log('Create key - req.body:', req.body);
            console.log('Create key - classId:', classId);

            const result = await enrollKeyService.createKey(
                parseInt(classId),
                req.body,
                userId,
                userRole
            );

            if (result.success) {
                return res.status(201).json(result);
            } else {
                const status = result.message.includes('quyền') || result.message.includes('phân công') ? 403 : 400;
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Create key controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    // Rotate enrollment key
    async rotateKey(req, res) {
        try {
            const { keyId } = req.body;
            const userId = req.user.userId;
            const userRole = req.userRoles?.includes('Admin') ? 'Admin' :
                req.userRoles?.includes('Instructor') ? 'Instructor' : 'Student';

            if (!keyId) {
                return res.status(400).json({
                    success: false,
                    message: 'keyId là bắt buộc'
                });
            }

            const result = await enrollKeyService.rotateKey(
                parseInt(keyId),
                userId,
                userRole
            );

            if (result.success) {
                return res.status(200).json(result);
            } else {
                const status = result.message === 'Bạn không có quyền' ? 403 : 404;
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Rotate key controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    // Revoke enrollment key
    async revokeKey(req, res) {
        try {
            const { keyId } = req.params;
            const userId = req.user.userId;
            const userRole = req.userRoles?.includes('Admin') ? 'Admin' :
                req.userRoles?.includes('Instructor') ? 'Instructor' : 'Student';

            const result = await enrollKeyService.revokeKey(
                parseInt(keyId),
                userId,
                userRole
            );

            if (result.success) {
                return res.status(200).json(result);
            } else {
                const status = result.message === 'Bạn không có quyền' ? 403 : 404;
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Revoke key controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    // Get keys by class
    async getKeysByClass(req, res) {
        try {
            const { classId } = req.params;
            const userId = req.user.userId;
            const userRole = req.userRoles?.includes('Admin') ? 'Admin' :
                req.userRoles?.includes('Instructor') ? 'Instructor' : 'Student';

            const result = await enrollKeyService.getKeysByClass(
                parseInt(classId),
                userId,
                userRole
            );

            if (result.success) {
                return res.status(200).json(result);
            } else {
                const status = result.message === 'Bạn không có quyền' ? 403 : 404;
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Get keys by class error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    // Get all keys (Admin only)
    async getAllKeys(req, res) {
        try {
            const result = await enrollKeyService.getAllKeys();

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Get all keys error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    // Validate enrollment key (public - for students before joining)
    async validateKey(req, res) {
        try {
            const { keyValue } = req.body;

            if (!keyValue) {
                return res.status(400).json({
                    success: false,
                    message: 'keyValue là bắt buộc'
                });
            }

            const result = await enrollKeyService.validateKey(keyValue);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Validate key error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }
}

module.exports = new EnrollKeyController();
