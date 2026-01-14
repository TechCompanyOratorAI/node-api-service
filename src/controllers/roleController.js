import { validationResult } from 'express-validator';
import roleService from '../services/roleService.js';

class RoleController {
  // Get all roles
  async getAllRoles(req, res) {
    try {
      const result = await roleService.getAllRoles();
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          roles: result.roles
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to get roles',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get all roles controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user roles
  async getUserRoles(req, res) {
    try {
      const { userId } = req.params;
      
      const result = await roleService.getUserRoles(parseInt(userId));
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          roles: result.roles
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to get user roles',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get user roles controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get current user roles
  async getMyRoles(req, res) {
    try {
      const userId = req.user.userId;
      
      const result = await roleService.getUserRoles(userId);
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          roles: result.roles
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to get your roles',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get my roles controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Assign role to user (admin only)
  async assignRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, roleName } = req.body;
      
      const result = await roleService.assignRoleToUser(parseInt(userId), roleName);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Assign role controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Remove role from user (admin only)
  async removeRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, roleName } = req.body;
      
      const result = await roleService.removeRoleFromUser(parseInt(userId), roleName);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Remove role controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get users by role (admin only)
  async getUsersByRole(req, res) {
    try {
      const { roleName } = req.params;
      
      const result = await roleService.getUsersByRole(roleName);
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          users: result.users,
          role: roleName
        });
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get users by role controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user role (admin only)
  async updateUserRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, oldRoleName, newRoleName } = req.body;
      
      const result = await roleService.updateUserRole(parseInt(userId), oldRoleName, newRoleName);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update user role controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Initialize default roles (admin only, run once)
  async initializeRoles(req, res) {
    try {
      const result = await roleService.initializeDefaultRoles();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Initialize roles controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

}

export default new RoleController();