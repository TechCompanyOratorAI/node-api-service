'use strict';
import db from '../models/index.js';

const { Feedback, User, Presentation } = db;

const VALID_FEEDBACK_TYPES = ['general', 'content', 'delivery', 'structure', 'engagement'];

class FeedbackService {
    // Create feedback
    async createFeedback(feedbackData) {
        try {
            const { presentationId, reviewerId, rating, comments, feedbackType, isVisibleToStudent } = feedbackData;
            if (!presentationId || !reviewerId) {
                return {
                    success: false,
                    message: 'Presentation ID và Reviewer ID là bắt buộc'
                };
            }
            const presentation = await Presentation.findByPk(presentationId);
            if (!presentation) {
                return {
                    success: false,
                    message: 'Không tìm thấy presentation'
                };
            }
            const reviewer = await User.findByPk(reviewerId);
            if (!reviewer) {
                return {
                    success: false,
                    message: 'Không tìm thấy reviewer'
                };
            }
            const existingFeedback = await Feedback.findOne({
                where: {
                    presentationId: presentationId,
                    reviewerId: reviewerId
                }
            });

            if (existingFeedback) {
                return {
                    success: false,
                    message: 'Bạn đã gửi feedback cho presentation này rồi'
                };
            }

            // Validate feedbackType
            const validFeedbackType = feedbackType || 'general';
            if (!VALID_FEEDBACK_TYPES.includes(validFeedbackType)) {
                return {
                    success: false,
                    message: `Loại feedback không hợp lệ. Các loại hợp lệ: ${VALID_FEEDBACK_TYPES.join(', ')}`
                };
            }

            const feedback = await Feedback.create({
                presentationId,
                reviewerId,
                rating,
                comments,
                feedbackType: validFeedbackType,
                isVisibleToStudent: isVisibleToStudent !== undefined ? isVisibleToStudent : true,
                createdAtFeedback: new Date()
            });

            return {
                success: true,
                message: 'Feedback đã được tạo thành công',
                data: feedback
            };

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Create feedback service error:', error);
            }
            return {
                success: false,
                message: 'Có lỗi xảy ra khi tạo feedback'
            };
        }
    }

    // Get feedback by ID
    async getFeedbackById(feedbackId) {
        try {
            const feedback = await Feedback.findByPk(feedbackId, {
                include: [
                    {
                        model: User,
                        as: 'reviewer',
                        attributes: ['userId', 'username', 'firstName', 'lastName']
                    },
                    {
                        model: Presentation,
                        as: 'presentation',
                        attributes: ['presentationId', 'title']
                    }
                ]
            });

            if (!feedback) {
                return {
                    success: false,
                    message: 'Không tìm thấy feedback'
                };
            }

            return {
                success: true,
                data: feedback
            };

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get feedback by ID service error:', error);
            }
            return {
                success: false,
                message: 'Có lỗi xảy ra khi lấy feedback'
            };
        }
    }

    // Get all feedback for a presentation
    async getFeedbackByPresentation(presentationId) {
        try {
            const feedback = await Feedback.findAll({
                where: { presentationId: presentationId },
                include: [
                    {
                        model: User,
                        as: 'reviewer',
                        attributes: ['userId', 'username', 'firstName', 'lastName']
                    }
                ],
                order: [['createdAtFeedback', 'DESC']]
            });

            return {
                success: true,
                data: feedback
            };

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get feedback by presentation service error:', error);
            }
            return {
                success: false,
                message: 'Có lỗi xảy ra khi lấy feedback của presentation'
            };
        }
    }

    // Get feedback given by a reviewer
    async getFeedbackByReviewer(reviewerId) {
        try {
            const feedback = await Feedback.findAll({
                where: { reviewerId: reviewerId },
                include: [
                    {
                        model: Presentation,
                        as: 'presentation',
                        attributes: ['presentationId', 'title']
                    }
                ],
                order: [['createdAtFeedback', 'DESC']]
            });

            return {
                success: true,
                data: feedback
            };

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get feedback by reviewer service error:', error);
            }
            return {
                success: false,
                message: 'Có lỗi xảy ra khi lấy feedback của reviewer'
            };
        }
    }

    // Update feedback
    async updateFeedback(feedbackId, updateData, userId) {
        try {
            const feedback = await Feedback.findByPk(feedbackId);
            if (!feedback) {
                return {
                    success: false,
                    message: 'Không tìm thấy feedback'
                };
            }
            if (feedback.reviewerId !== userId) {
                return {
                    success: false,
                    message: 'Bạn chỉ có thể cập nhật feedback của mình'
                };
            }

            const { rating, comments, feedbackType, isVisibleToStudent } = updateData;
            const updateFields = {};

            if (rating !== undefined) updateFields.rating = rating;
            if (comments !== undefined) updateFields.comments = comments;

            // Validate feedbackType
            if (feedbackType !== undefined) {
                if (!VALID_FEEDBACK_TYPES.includes(feedbackType)) {
                    return {
                        success: false,
                        message: `Loại feedback không hợp lệ. Các loại hợp lệ: ${VALID_FEEDBACK_TYPES.join(', ')}`
                    };
                }
                updateFields.feedbackType = feedbackType;
            }

            if (isVisibleToStudent !== undefined) updateFields.isVisibleToStudent = isVisibleToStudent;

            await feedback.update(updateFields);

            return {
                success: true,
                message: 'Feedback đã được cập nhật thành công',
                data: feedback
            };

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Update feedback service error:', error);
            }
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật feedback'
            };
        }
    }

    // Delete feedback
    async deleteFeedback(feedbackId, userId) {
        try {
            const feedback = await Feedback.findByPk(feedbackId);
            if (!feedback) {
                return {
                    success: false,
                    message: 'Không tìm thấy feedback'
                };
            }
            if (feedback.reviewerId !== userId) {
                return {
                    success: false,
                    message: 'Bạn chỉ có thể xóa feedback của mình'
                };
            }

            await feedback.destroy();

            return {
                success: true,
                message: 'Feedback đã được xóa thành công'
            };

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Delete feedback service error:', error);
            }
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa feedback'
            };
        }
    }

    // Get all feedback (admin only)
    async getAllFeedback() {
        try {
            const feedback = await Feedback.findAll({
                include: [
                    {
                        model: User,
                        as: 'reviewer',
                        attributes: ['userId', 'username', 'firstName', 'lastName']
                    },
                    {
                        model: Presentation,
                        as: 'presentation',
                        attributes: ['presentationId', 'title']
                    }
                ],
                order: [['createdAtFeedback', 'DESC']]
            });

            return {
                success: true,
                data: feedback
            };

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get all feedback service error:', error);
            }
            return {
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách feedback'
            };
        }
    }
}

export default new FeedbackService();