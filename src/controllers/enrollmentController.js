'use strict';
import enrollmentService from '../services/enrollmentService.js';

class EnrollmentController {
    async enrollCourse(req, res) {
        try {
            const { courseId } = req.params;
            const result = await enrollmentService.enrollCourse(parseInt(courseId), req.user.userId);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Enroll course controller error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async dropCourse(req, res) {
        try {
            const { courseId } = req.params;
            const result = await enrollmentService.dropCourse(parseInt(courseId), req.user.userId);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Drop course controller error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async listMyCourses(req, res) {
        try {
            const result = await enrollmentService.listMyCourses(req.user.userId);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('List my courses controller error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async enrollTopic(req, res) {
        try {
            const { topicId } = req.params;
            const result = await enrollmentService.enrollTopic(parseInt(topicId), req.user.userId);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Enroll topic controller error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async dropTopic(req, res) {
        try {
            const { topicId } = req.params;
            const result = await enrollmentService.dropTopic(parseInt(topicId), req.user.userId);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Drop topic controller error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async listMyTopics(req, res) {
        try {
            const result = await enrollmentService.listMyTopics(req.user.userId);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('List my topics controller error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

export default new EnrollmentController();
