import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  validateRegistration,
  validateInstructorRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateChangePassword
} from '../middleware/validationMiddleware.js';
import {
  passwordResetRateLimit,
  emailVerificationRateLimit
} from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public authentication routes
router.post('/register', validateRegistration, authController.register);

// Admin-only: create instructor account (no email verification needed)
router.post('/register-instructor', authenticateToken, requireRole(['Admin']), validateInstructorRegistration, authController.registerInstructor);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);

// Email verification routes
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', emailVerificationRateLimit, validateEmail, authController.resendVerificationEmail);

// Password reset routes
router.post('/forgot-password', passwordResetRateLimit, validateEmail, authController.forgotPassword);
router.post('/reset-password', passwordResetRateLimit, validatePasswordReset, authController.resetPassword);

// Token refresh route
router.post('/refresh-token', authController.refreshToken);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, validateChangePassword, authController.changePassword);

export default router;