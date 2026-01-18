'use strict';
import feedbackService from '../services/feedbackService.js';

class FeedbackController {
    // Create feedback
    async createFeedback(req, res) {
        try {
            const feedbackData = {
                ...req.body,
                reviewerId: req.user.userId 
            };

            const result = await feedbackService.createFeedback(feedbackData);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(400).json(result);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Create feedback controller error:', error);
            }
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo feedback'
            });
        }
    }

    // Get feedback by ID
    async getFeedbackById(req, res) {
        try {
            const { feedbackId } = req.params;
            const result = await feedbackService.getFeedbackById(parseInt(feedbackId));

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(404).json(result);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get feedback by ID controller error:', error);
            }
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy feedback'
            });
        }
    }

    // Get feedback for a presentation
    async getFeedbackByPresentation(req, res) {
        try {
            const { presentationId } = req.params;
            const result = await feedbackService.getFeedbackByPresentation(parseInt(presentationId));

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(500).json(result);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get feedback by presentation controller error:', error);
            }
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy feedback của presentation'
            });
        }
    }

    // Get feedback given by current user
    async getMyFeedback(req, res) {
        try {
            const result = await feedbackService.getFeedbackByReviewer(req.user.userId);

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(500).json(result);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get my feedback controller error:', error);
            }
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy feedback của bạn'
            });
        }
    }

    // Update feedback
    async updateFeedback(req, res) {
        try {
            const { feedbackId } = req.params;
            const result = await feedbackService.updateFeedback(
                parseInt(feedbackId),
                req.body,
                req.user.userId
            );

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(400).json(result);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Update feedback controller error:', error);
            }
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật feedback'
            });
        }
    }

    // Delete feedback
    async deleteFeedback(req, res) {
        try {
            const { feedbackId } = req.params;
            const result = await feedbackService.deleteFeedback(
                parseInt(feedbackId),
                req.user.userId
            );

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(400).json(result);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Delete feedback controller error:', error);
            }
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa feedback'
            });
        }
    }

    // Get all feedback (admin only)
    async getAllFeedback(req, res) {
        try {
            const result = await feedbackService.getAllFeedback();

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(500).json(result);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get all feedback controller error:', error);
            }
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách feedback'
            });
        }
    }
}

export default new FeedbackController();