import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import roleService from '../services/roleService.js';

const { User } = db;

// Verify JWT token middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: ['userId', 'username', 'email', 'firstName', 'lastName', 'isActive', 'isEmailVerified']
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: ['userId', 'username', 'email', 'firstName', 'lastName', 'isActive', 'isEmailVerified']
    });

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just set user to null and continue
    req.user = null;
    next();
  }
};

// Require email verification middleware
export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required'
    });
  }

  next();
};

// Role-based access control middleware
export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user roles from database (using roleService to avoid association issues)
      const userRolesResult = await roleService.getUserRoles(req.user.userId);
      
      if (!userRolesResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to get user roles'
        });
      }

      const userRoles = userRolesResult.roles.map(role => role.roleName);
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      req.userRoles = userRoles;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

export default {
  authenticateToken,
  optionalAuth,
  requireEmailVerification,
  requireRole
};