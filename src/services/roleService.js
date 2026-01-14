import db from "../models/index.js";

const { Role, UserRole, User } = db;

class RoleService {
  // Get all roles
  async getAllRoles() {
    try {
      const roles = await Role.findAll({
        attributes: ["roleId", "roleName", "description"],
        order: [["roleName", "ASC"]],
      });
      return { success: true, roles };
    } catch (error) {
      console.error("Get all roles error:", error);
      return { success: false, error: error.message };
    }
  }

  // Get role by name
  async getRoleByName(roleName) {
    try {
      const role = await Role.findOne({
        where: { roleName },
        attributes: ["roleId", "roleName", "description"],
      });
      return role;
    } catch (error) {
      console.error("Get role by name error:", error);
      return null;
    }
  }

  // Get user roles
  async getUserRoles(userId) {
    try {
      // Use simple approach without include to avoid association issues
      const userRoles = await UserRole.findAll({
        where: { userId },
        attributes: ['roleId', 'assignedAt']
      });
      
      if (userRoles.length === 0) {
        return { success: true, roles: [] };
      }
      
      const roleIds = userRoles.map(ur => ur.roleId);
      const roles = await Role.findAll({
        where: { roleId: roleIds },
        attributes: ["roleId", "roleName", "description"]
      });
      
      return { success: true, roles };
    } catch (error) {
      console.error("Get user roles error:", error);
      return { success: false, error: error.message };
    }
  }

  // Assign role to user
  async assignRoleToUser(userId, roleName) {
    try {
      // Get role by name
      const role = await this.getRoleByName(roleName);
      if (!role) {
        return { success: false, message: `Role '${roleName}' not found` };
      }

      // Check if user already has this role
      const existingUserRole = await UserRole.findOne({
        where: { userId, roleId: role.roleId },
      });

      if (existingUserRole) {
        return {
          success: false,
          message: `User already has role '${roleName}'`,
        };
      }

      // Assign role
      await UserRole.create({
        userId,
        roleId: role.roleId,
        assignedAt: new Date(),
      });

      return {
        success: true,
        message: `Role '${roleName}' assigned successfully`,
      };
    } catch (error) {
      console.error("Assign role error:", error);
      return { success: false, error: error.message };
    }
  }

  // Remove role from user
  async removeRoleFromUser(userId, roleName) {
    try {
      // Get role by name
      const role = await this.getRoleByName(roleName);
      if (!role) {
        return { success: false, message: `Role '${roleName}' not found` };
      }

      // Remove role
      const deleted = await UserRole.destroy({
        where: { userId, roleId: role.roleId },
      });

      if (deleted === 0) {
        return {
          success: false,
          message: `User doesn't have role '${roleName}'`,
        };
      }

      return {
        success: true,
        message: `Role '${roleName}' removed successfully`,
      };
    } catch (error) {
      console.error("Remove role error:", error);
      return { success: false, error: error.message };
    }
  }

  // Assign default role to new user (Student)
  async assignDefaultRole(userId) {
    try {
      const result = await this.assignRoleToUser(userId, "Student");
      return result;
    } catch (error) {
      console.error("Assign default role error:", error);
      return { success: false, error: error.message };
    }
  }

  // Check if user has specific role
  async userHasRole(userId, roleName) {
    try {
      const role = await this.getRoleByName(roleName);
      if (!role) return false;

      const userRole = await UserRole.findOne({
        where: { userId, roleId: role.roleId },
      });

      return !!userRole;
    } catch (error) {
      console.error("Check user role error:", error);
      return false;
    }
  }

  // Get users by role
  async getUsersByRole(roleName) {
    try {
      const role = await this.getRoleByName(roleName);
      if (!role) {
        return { success: false, message: `Role '${roleName}' not found` };
      }

      const userRoles = await UserRole.findAll({
        where: { roleId: role.roleId },
        attributes: ['userId', 'assignedAt'],
        order: [["assignedAt", "DESC"]],
      });

      if (userRoles.length === 0) {
        return { success: true, users: [] };
      }

      const userIds = userRoles.map(ur => ur.userId);
      const users = await User.findAll({
        where: { userId: userIds },
        attributes: [
          "userId",
          "username", 
          "email",
          "firstName",
          "lastName",
          "isActive",
          "isEmailVerified",
        ]
      });

      // Merge user data with assignedAt
      const usersWithAssignedAt = users.map(user => {
        const userRole = userRoles.find(ur => ur.userId === user.userId);
        return {
          ...user.toJSON(),
          assignedAt: userRole.assignedAt,
        };
      });

      return { success: true, users: usersWithAssignedAt };
    } catch (error) {
      console.error("Get users by role error:", error);
      return { success: false, error: error.message };
    }
  }

  // Update user role (remove old, add new)
  async updateUserRole(userId, oldRoleName, newRoleName) {
    try {
      // Remove old role
      await this.removeRoleFromUser(userId, oldRoleName);

      // Assign new role
      const result = await this.assignRoleToUser(userId, newRoleName);

      return result;
    } catch (error) {
      console.error("Update user role error:", error);
      return { success: false, error: error.message };
    }
  }

  // Initialize default roles (run once)
  async initializeDefaultRoles() {
    try {
      const defaultRoles = [
        {
          roleName: "Admin",
          description: "System administrator with full access",
        },
        {
          roleName: "Instructor",
          description: "Course instructor who can create and manage courses",
        },
        {
          roleName: "Student",
          description:
            "Student who can enroll in courses and create presentations",
        },
      ];

      for (const roleData of defaultRoles) {
        const existingRole = await Role.findOne({
          where: { roleName: roleData.roleName },
        });

        if (!existingRole) {
          await Role.create(roleData);
          console.log(`Created role: ${roleData.roleName}`);
        }
      }

      return { success: true, message: "Default roles initialized" };
    } catch (error) {
      console.error("Initialize roles error:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new RoleService();
