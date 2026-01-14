import { validationResult } from 'express-validator';
import courseService from '../services/courseService.js';

class CourseController {
    // Create new course
    async createCourse(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const result = await courseService.createCourse(req.body, req.user.userId);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Create course controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get all courses
    async getAllCourses(req, res) {
        try {
            const filters = {
                instructorId: req.query.instructorId,
                semester: req.query.semester,
                academicYear: req.query.academicYear,
                isActive: req.query.isActive,
                search: req.query.search
            };

            const pagination = {
                page: req.query.page,
                limit: req.query.limit,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };

            const result = await courseService.getAllCourses(filters, pagination);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Get all courses controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get course by ID
    async getCourseById(req, res) {
        try {
            const { courseId } = req.params;
            const includeStats = req.query.includeStats === 'true';

            const result = await courseService.getCourseById(courseId, includeStats);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(404).json(result);
            }
        } catch (error) {
            console.error('Get course by ID controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update course
    async updateCourse(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { courseId } = req.params;
            const result = await courseService.updateCourse(courseId, req.body, req.user.userId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Update course controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Delete course
    async deleteCourse(req, res) {
        try {
            const { courseId } = req.params;
            const result = await courseService.deleteCourse(courseId, req.user.userId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Delete course controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Create topic for course
    async createTopic(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { courseId } = req.params;
            const result = await courseService.createTopic(courseId, req.body, req.user.userId);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Create topic controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get topics by course
    async getTopicsByCourse(req, res) {
        try {
            const { courseId } = req.params;
            const result = await courseService.getTopicsByCourse(courseId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(404).json(result);
            }
        } catch (error) {
            console.error('Get topics by course controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get topic by ID
    async getTopicById(req, res) {
        try {
            const { topicId } = req.params;
            const result = await courseService.getTopicById(topicId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(404).json(result);
            }
        } catch (error) {
            console.error('Get topic by ID controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update topic
    async updateTopic(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { topicId } = req.params;
            const result = await courseService.updateTopic(topicId, req.body, req.user.userId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Update topic controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Delete topic
    async deleteTopic(req, res) {
        try {
            const { topicId } = req.params;
            const result = await courseService.deleteTopic(topicId, req.user.userId);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Delete topic controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export default new CourseController();
