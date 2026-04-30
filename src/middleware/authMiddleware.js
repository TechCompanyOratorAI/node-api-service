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
        message: 'Dữ liệu không hợp lệ'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database with role
    const user = await User.findByPk(decoded.userId, {
      attributes: ['userId', 'username', 'email', 'firstName', 'lastName', 'isActive', 'isEmailVerified'],
      include: [
        {
          model: db.UserRole,
          as: 'userRoles',
          include: [
            {
              model: db.Role,
              as: 'role',
              attributes: ['roleId', 'roleName']
            }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tìm thấy'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Extract primary role for authorization
    const primaryRole = user.userRoles && user.userRoles[0] && user.userRoles[0].role 
      ? user.userRoles[0].role.roleName 
      : null;
        
    // Add user and role to request object
    req.user = { ...user.toJSON(), role: primaryRole };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access token không hợp lệ'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token đã hết hạn'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ'
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
    
    // Get user from database with role
    const user = await User.findByPk(decoded.userId, {
      attributes: ['userId', 'username', 'email', 'firstName', 'lastName', 'isActive', 'isEmailVerified'],
      include: [
        {
          model: db.UserRole,
          as: 'userRoles',
          include: [
            {
              model: db.Role,
              as: 'role',
              attributes: ['roleId', 'roleName']
            }
          ]
        }
      ]
    });

    if (user && user.isActive) {
      const primaryRole = user.userRoles && user.userRoles[0] && user.userRoles[0].role 
        ? user.userRoles[0].role.roleName 
        : null;
      req.user = { ...user.toJSON(), role: primaryRole };
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
      message: 'Xác thực là bắt buộc'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Xác thực email là bắt buộc'
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
          message: 'Xác thực là bắt buộc'
        });
      }

      // Get user roles from database (using roleService to avoid association issues)
      const userRolesResult = await roleService.getUserRoles(req.user.userId);
      
      if (!userRolesResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Thao tác thất bại'
        });
      }

      const userRoles = userRolesResult.roles.map(role => role.roleName);
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập tài nguyên này'
        });
      }

      req.userRoles = userRoles;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ nội bộ'
      });
    }
  };
};

// Censored status check middleware
export const requireCensored = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Xác thực là bắt buộc'
      });
    }

    // Check if user is censored (isCensored must be true)
    if (!req.user.isCensored) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    next();
  };
};

export default {
  authenticateToken,
  optionalAuth,
  requireEmailVerification,
  requireRole,
  requireCensored
};
