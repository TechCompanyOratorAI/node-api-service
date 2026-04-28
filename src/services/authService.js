import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../models/index.js";
import emailService from "./emailService.js";
import roleService from "./roleService.js";

const { User } = db;

class AuthService {
  // Generate JWT tokens
  generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate random token
  generateRandomToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  // Register user (Student by default)
  async register(userData) {
    try {
      const { username, email, password, firstName, lastName } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [db.Sequelize.Op.or]: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return {
          success: false,
          message:
            existingUser.email === email
              ? "Email already registered"
              : "Username already taken",
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = this.generateRandomToken();
      const emailVerificationExpires = new Date(
        Date.now() +
        (parseInt(process.env.EMAIL_VERIFICATION_EXPIRES) ||
          24 * 60 * 60 * 1000) // 24 hours default
      );

      // Create user
      const user = await User.create({
        username,
        email,
        firstName,
        lastName,
        passwordHash,
        emailVerificationToken,
        emailVerificationExpires,
        isEmailVerified: false,
        isActive: true,
      });

      // Assign default role (Student)
      const roleResult = await roleService.assignDefaultRole(user.userId);
      if (!roleResult.success) {
        console.error("Failed to assign default role:", roleResult.error);
        // Try to assign role directly
        try {
          await roleService.assignRoleToUser(user.userId, "Student");
        } catch (directRoleError) {
          console.error(
            "Failed to assign Student role directly:",
            directRoleError
          );
        }
      }

      // Send verification email
      await emailService.sendVerificationEmail(
        email,
        firstName,
        username,
        emailVerificationToken
      );

      return {
        success: true,
        message:
          "Đăng ký tài khoản thành công, vui lòng kiểm tra email để xác thực",
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: "Registration thất bại. vui lòng try again.",
        error: error.message,
      };
    }
  }

  // Register instructor
  async registerInstructor(userData) {
    try {
      const { username, email, password, firstName, lastName, studyMajor, departmentId } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [db.Sequelize.Op.or]: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return {
          success: false,
          message:
            existingUser.email === email
              ? "Email already registered"
              : "Username already taken",
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = this.generateRandomToken();
      const emailVerificationExpires = new Date(
        Date.now() +
        (parseInt(process.env.EMAIL_VERIFICATION_EXPIRES) ||
          24 * 60 * 60 * 1000) // 24 hours default
      );

      // Create user
      const user = await User.create({
        username,
        email,
        firstName,
        lastName,
        studyMajor,
        departmentId,
        passwordHash,
        emailVerificationToken,
        emailVerificationExpires,
        isEmailVerified: false,
        isActive: true,
      });

      // Assign Instructor role
      const roleResult = await roleService.assignRoleToUser(
        user.userId,
        "Instructor"
      );
      if (!roleResult.success) {
        console.error("Failed to assign Instructor role:", roleResult.error);
      }

      // Send verification email for instructor
      await emailService.sendVerificationEmail(
        email,
        firstName,
        username,
        emailVerificationToken
      );

      return {
        success: true,
        message:
          "Đăng ký tài khoản giảng viên thành công, vui lòng kiểm tra email để xác thực",
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          role: "Instructor",
        },
      };
    } catch (error) {
      console.error("Instructor registration error:", error);
      return {
        success: false,
        message: "Instructor registration thất bại. vui lòng try again.",
        error: error.message,
      };
    }
  }

  // Login user
  async login(loginData) {
    try {
      const { emailOrUsername, password, selectedRole } = loginData;

      // Find user by email or username
      const user = await User.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { email: emailOrUsername },
            { username: emailOrUsername },
          ],
        },
      });

      if (!user) {
        return {
          success: false,
          message: "Không hợp lệ credentials",
        };
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        return {
          success: false,
          message:
            "Thao tác thất bại",
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: "Tài khoản đã bị vô hiệu hóa",
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(
        password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        // Increment login attempts
        const loginAttempts = (user.loginAttempts || 0) + 1;
        const updateData = { loginAttempts };

        // Lock account after 5 failed attempts
        if (loginAttempts >= 5) {
          updateData.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await User.update(updateData, { where: { userId: user.userId } });

        return {
          success: false,
          message: "Không hợp lệ credentials",
        };
      }

      // Reset login attempts and update last login
      await User.update(
        {
          loginAttempts: 0,
          lockUntil: null,
          lastLoginAt: new Date(),
        },
        { where: { userId: user.userId } }
      );

      // Get user roles
      const userRolesResult = await roleService.getUserRoles(user.userId);
      const roles = userRolesResult.success ? userRolesResult.roles : [];

      // Validate selected role if provided
      if (selectedRole) {
        const userRoleNames = roles.map((role) => role.roleName);
        if (!userRoleNames.includes(selectedRole)) {
          return {
            success: false,
            message: `Bạn không có quyền truy cập với vai trò ${selectedRole}`,
          };
        }
      }

      // Generate tokens
      const tokens = this.generateTokens(user.userId);

      return {
        success: true,
        message: "đăng nhập thành công",
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
          lastLoginAt: new Date(),
          roles: roles.map((role) => ({
            roleId: role.roleId,
            roleName: role.roleName,
            description: role.description,
          })),
        },
        tokens,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "đăng nhập thất bại. vui lòng try again.",
        error: error.message,
      };
    }
  }

  // Verify email
  async verifyEmail(token) {
    try {
      const user = await User.findOne({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            [db.Sequelize.Op.gt]: new Date(),
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: "Dữ liệu không hợp lệ",
        };
      }

      await User.update(
        {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
        { where: { userId: user.userId } }
      );

      // Send welcome email
      await emailService.sendWelcomeEmail(
        user.email,
        user.firstName,
        user.username
      );

      return {
        success: true,
        message: "Email verified thành công",
      };
    } catch (error) {
      console.error("Email verification error:", error);
      return {
        success: false,
        message: "Email verification thất bại. vui lòng try again.",
        error: error.message,
      };
    }
  }

  // Resend verification email
  async resendVerificationEmail(email) {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return {
          success: false,
          message: "Người dùng không tìm thấy",
        };
      }

      if (user.isEmailVerified) {
        return {
          success: false,
          message: "Email đã được xác thực",
        };
      }

      // Generate new verification token
      const emailVerificationToken = this.generateRandomToken();
      const emailVerificationExpires = new Date(
        Date.now() +
        (parseInt(process.env.EMAIL_VERIFICATION_EXPIRES) ||
          24 * 60 * 60 * 1000) // 24 hours default
      );

      await User.update(
        {
          emailVerificationToken,
          emailVerificationExpires,
        },
        { where: { userId: user.userId } }
      );

      // Send verification email
      await emailService.sendVerificationEmail(
        email,
        user.firstName,
        user.username,
        emailVerificationToken
      );

      return {
        success: true,
        message: "Verification email sent thành công",
      };
    } catch (error) {
      console.error("Resend verification error:", error);
      return {
        success: false,
        message: "Thao tác thất bại",
        error: error.message,
      };
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message:
            "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi",
        };
      }

      // Generate password reset token
      const passwordResetToken = this.generateRandomToken();
      const passwordResetExpires = new Date(
        Date.now() +
        (parseInt(process.env.PASSWORD_RESET_EXPIRES) || 60 * 60 * 1000) // 1 hour default
      );

      await User.update(
        {
          passwordResetToken,
          passwordResetExpires,
        },
        { where: { userId: user.userId } }
      );

      // Send password reset email
      await emailService.sendPasswordResetEmail(
        email,
        user.firstName,
        user.username,
        passwordResetToken
      );

      return {
        success: true,
        message:
          "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi",
      };
    } catch (error) {
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: "Thao tác thất bại",
        error: error.message,
      };
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            [db.Sequelize.Op.gt]: new Date(),
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: "Dữ liệu không hợp lệ",
        };
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      await User.update(
        {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          loginAttempts: 0,
          lockUntil: null,
        },
        { where: { userId: user.userId } }
      );

      return {
        success: true,
        message: "Mật khẩu reset thành công",
      };
    } catch (error) {
      console.error("Reset password error:", error);
      return {
        success: false,
        message: "Mật khẩu reset thất bại. vui lòng try again.",
        error: error.message,
      };
    }
  }

  // Change password (for authenticated users)
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return {
          success: false,
          message: "Người dùng không tìm thấy",
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: "Mật khẩu hiện tại không chính xác",
        };
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      await User.update(
        {
          passwordHash,
        },
        { where: { userId } }
      );

      return {
        success: true,
        message: "Mật khẩu changed thành công",
      };
    } catch (error) {
      console.error("Change password error:", error);
      return {
        success: false,
        message: "Mật khẩu change thất bại. vui lòng try again.",
        error: error.message,
      };
    }
  }

  // Refresh token
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive) {
        return {
          success: false,
          message: "Không hợp lệ làm mới token",
        };
      }

      const tokens = this.generateTokens(user.userId);

      return {
        success: true,
        tokens,
      };
    } catch (error) {
      console.error("Refresh token error:", error);
      return {
        success: false,
        message: "Không hợp lệ làm mới token",
      };
    }
  }
}

export default new AuthService();
