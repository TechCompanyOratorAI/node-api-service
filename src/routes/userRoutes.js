import express from 'express';
import { authenticateToken, requireEmailVerification, requireRole } from '../middleware/authMiddleware.js';
import { uploadAvatar, uploadErrorHandler } from '../middleware/uploadMiddleware.js';
import userController from '../controllers/userController.js';
const router = express.Router();

// Example protected routes
// All routes in this file require authentication

// Get all users (admin only)
router.get('/',
  authenticateToken,
  requireEmailVerification,
  requireRole(['admin']),
  (req, res) => {
    // userController.getAllUsers
    res.json({ message: 'Get all users - Admin only' });
  }
);

// Get user profile (any authenticated user)
router.get('/profile',
  authenticateToken,
  (req, res) => {
    // userController.getUserProfile
    res.json({
      message: 'User profile',
      user: req.user
    });
  }
);

// Update user profile (authenticated user, email verified)
router.put('/profile',
  authenticateToken,
  requireEmailVerification,
  (req, res) => {
    // userController.updateUserProfile
    res.json({ message: 'Update user profile' });
  }
);

// Delete user (admin only)
router.delete('/:userId',
  authenticateToken,
  requireEmailVerification,
  requireRole(['admin']),
  (req, res) => {
    // userController.deleteUser
    res.json({ message: `Delete user ${req.params.userId}` });
  });

  
// Upload avatar (authenticated user, email verified)
router.post('/avatar',
  authenticateToken,
  requireEmailVerification,
  uploadAvatar.single('avatar'),
  userController.uploadAvatar.bind(userController)
);

export default router;