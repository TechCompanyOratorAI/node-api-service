'use strict';
const { validationResult } = require('express-validator');
const enrollmentService = require('../services/enrollmentService');

class EnrollmentController {
    /**
     * Student joins a class using enrollment key
     * POST /api/v1/enrollments/join
     * Body: { enrollKey: string }
     */
    async joinClass(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { enrollKey } = req.body;
            const studentId = req.user.userId;

            const result = await enrollmentService.joinClass(enrollKey, studentId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                // Determine status code based on error message
                let status = 400;
                if (result.message.includes('không tìm thấy') || result.message.includes('không tồn tại')) {
                    status = 404;
                } else if (result.message.includes('đã hết hạn') || result.message.includes('đã hết số lượng') ||
                    result.message.includes('đã đạt giới hạn') || result.message.includes('đã đóng')) {
                    status = 400;
                }
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Join class controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ',
                error: error.message
            });
        }
    }

    /**
     * Get student's enrolled classes
     * GET /api/v1/me/classes
     */
    async getMyClasses(req, res) {
        try {
            const studentId = req.user.userId;
            const result = await enrollmentService.getMyClasses(studentId);

            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Get my classes controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ',
                error: error.message
            });
        }
    }

    /**
     * Student leaves a class
     * DELETE /api/v1/classes/:classId/leave
     */
    async leaveClass(req, res) {
        try {
            const { classId } = req.params;
            const studentId = req.user.userId;

            const result = await enrollmentService.leaveClass(parseInt(classId), studentId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                const status = result.message.includes('không tìm thấy') ? 404 : 400;
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Leave class controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ',
                error: error.message
            });
        }
    }

    /**
     * Get students enrolled in a class (for instructors/admin)
     * GET /api/v1/classes/:classId/students
     */
    async getClassStudents(req, res) {
        try {
            const { classId } = req.params;
            const userId = req.user.userId;
            const userRole = req.userRoles?.includes('Admin') ? 'Admin' :
                req.userRoles?.includes('Instructor') ? 'Instructor' : 'Student';

            const result = await enrollmentService.getClassStudents(parseInt(classId), userId, userRole);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                let status = 400;
                if (result.message.includes('không có quyền')) {
                    status = 403;
                } else if (result.message.includes('không tìm thấy')) {
                    status = 404;
                }
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Get class students controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ',
                error: error.message
            });
        }
    }

    // ==================== TOPIC ENROLLMENT METHODS (KEPT FROM OLD VERSION) ====================

    /**
     * Enroll in a topic within enrolled class
     * POST /api/v1/topics/:topicId/enroll
     */
    async enrollTopic(req, res) {
        try {
            const { topicId } = req.params;
            const result = await enrollmentService.enrollTopic(parseInt(topicId), req.user.userId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                const status = result.message.includes('không tìm thấy') ? 404 : 400;
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Enroll topic controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ',
                error: error.message
            });
        }
    }

    /**
     * Drop a topic enrollment
     * DELETE /api/v1/topics/:topicId/drop
     */
    async dropTopic(req, res) {
        try {
            const { topicId } = req.params;
            const result = await enrollmentService.dropTopic(parseInt(topicId), req.user.userId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                const status = result.message.includes('không tìm thấy') ? 404 : 400;
                return res.status(status).json(result);
            }
        } catch (error) {
            console.error('Drop topic controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ',
                error: error.message
            });
        }
    }

    /**
     * Get student's enrolled topics across all classes
     * GET /api/v1/me/topics
     */
    async listMyTopics(req, res) {
        try {
            const result = await enrollmentService.listMyTopics(req.user.userId);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('List my topics controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ',
                error: error.message
            });
        }
    }
}

module.exports = new EnrollmentController();
