import { validationResult } from 'express-validator';
import courseService from '../services/courseService.js';
import roleService from '../services/roleService.js';

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
                departmentId: req.query.departmentId,
                subjectAreaId: req.query.subjectAreaId,
                academicBlockId: req.query.academicBlockId,
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

    // Get my courses (for logged-in instructor)
    async getMyCourses(req, res) {
        try {
            const instructorId = req.user.userId;

            const filters = {
                semester: req.query.semester,
                academicYear: req.query.academicYear,
                academicBlockId: req.query.academicBlockId,
                isActive: req.query.isActive,
                search: req.query.search
            };

            const pagination = {
                page: req.query.page,
                limit: req.query.limit,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };

            const result = await courseService.getCoursesByInstructor(instructorId, filters, pagination);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(404).json(result);
            }
        } catch (error) {
            console.error('Get my courses controller error:', error);
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
            const userId = req.user?.userId;

            // Get user roles to check if student
            let isStudent = false;
            if (userId) {
                const userRolesResult = await roleService.getUserRoles(userId);
                if (userRolesResult.success) {
                    const userRoles = userRolesResult.roles.map(role => role.roleName);
                    isStudent = userRoles.includes('Student') && !userRoles.some(role => ['Admin', 'Instructor', 'Teacher'].includes(role));
                }
            }

            const result = await courseService.getCourseById(courseId, includeStats, isStudent);

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
            // Get user role (Admin has priority)
            const userRole = req.userRoles && (req.userRoles.includes('Admin') || req.userRoles.includes('AcademicCoordinator')) ? 'Admin' : 'Instructor';
            const result = await courseService.updateCourse(courseId, req.body, req.user.userId, userRole);

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
            // Get user role (Admin has priority)
            const userRole = req.userRoles && (req.userRoles.includes('Admin') || req.userRoles.includes('AcademicCoordinator')) ? 'Admin' : 'Instructor';
            const result = await courseService.deleteCourse(courseId, req.user.userId, userRole);

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

    // ============================================================================
    // Course Instructor Management
    // ============================================================================

    // Add instructor(s) to course
    async addCourseInstructor(req, res) {
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
            const { instructorId, instructorIds } = req.body;
            const assignedBy = req.user.userId;

            // Handle single instructor
            if (instructorId) {
                const result = await courseService.addCourseInstructor(
                    parseInt(courseId),
                    instructorId,
                    assignedBy
                );

                if (result.success) {
                    return res.status(201).json(result);
                } else {
                    return res.status(400).json(result);
                }
            }

            // Handle multiple instructors
            if (instructorIds && Array.isArray(instructorIds)) {
                const results = [];
                const errors = [];

                for (const instrId of instructorIds) {
                    const result = await courseService.addCourseInstructor(
                        parseInt(courseId),
                        instrId,
                        assignedBy
                    );

                    if (result.success) {
                        results.push({ instructorId: instrId, ...result });
                    } else {
                        errors.push({ instructorId: instrId, error: result.message });
                    }
                }

                return res.status(201).json({
                    success: true,
                    message: `Đã thêm ${results.length}/${instructorIds.length} giảng viên`,
                    added: results,
                    failed: errors
                });
            }
        } catch (error) {
            console.error('Add course instructor controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Remove instructor from course
    async removeCourseInstructor(req, res) {
        try {
            const { courseId, instructorId } = req.params;

            const result = await courseService.removeCourseInstructor(
                parseInt(courseId),
                parseInt(instructorId)
            );

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Remove course instructor controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get course instructors
    async getCourseInstructors(req, res) {
        try {
            const { courseId } = req.params;

            const result = await courseService.getCourseInstructors(parseInt(courseId));

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(404).json(result);
            }
        } catch (error) {
            console.error('Get course instructors controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get available instructors for course (same major)
    async getAvailableInstructors(req, res) {
        try {
            const { courseId } = req.params;
            const filters = {
                search: req.query.search
            };

            const result = await courseService.getAvailableInstructors(
                parseInt(courseId),
                filters
            );

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(404).json(result);
            }
        } catch (error) {
            console.error('Get available instructors controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export default new CourseController();
