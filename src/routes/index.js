import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import emailRoutes from './emailRoutes.js';
import courseRoutes from './courseRoutes.js';
import topicRoutes from './topicRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import roleRoutes from './roleRoutes.js';
import presentationRoutes from './presentationRoutes.js';
import { generalRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Apply general rate limiting to all API routes
router.use(generalRateLimit);

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/email', emailRoutes);
router.use('/courses', courseRoutes);
router.use('/topics', topicRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/roles', roleRoutes);
router.use('/presentations', presentationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

export default router;