import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';
import { authenticateToken, requireEmailVerification, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);
router.use(requireRole(['Student']));

// Course enrollments
router.post('/courses/:courseId', enrollmentController.enrollCourse);
router.delete('/courses/:courseId', enrollmentController.dropCourse);
router.get('/courses', enrollmentController.listMyCourses);

// Topic enrollments
router.post('/topics/:topicId', enrollmentController.enrollTopic);
router.delete('/topics/:topicId', enrollmentController.dropTopic);
router.get('/topics', enrollmentController.listMyTopics);

export default router;
