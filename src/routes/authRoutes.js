import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  validateRegistration,
  validateInstructorRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateChangePassword
} from '../middleware/validationMiddleware.js';
import {
  authRateLimit,
  passwordResetRateLimit,
  emailVerificationRateLimit
} from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public authentication routes
router.post('/register', authRateLimit, validateRegistration, authController.register);
router.post('/register-instructor', authRateLimit, validateInstructorRegistration, authController.registerInstructor);
router.post('/login', authRateLimit, validateLogin, authController.login);
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