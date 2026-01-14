import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../models/index.js";
import emailService from "./emailService.js";

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

  // Register user
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
        Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRES)
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
          "Registration successful. Please check your email to verify your account.",
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
        message: "Registration failed. Please try again.",
        error: error.message,
      };
    }
  }

  // Login user
  async login(loginData) {
    try {
      const { emailOrUsername, password } = loginData;

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
          message: "Invalid credentials",
        };
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        return {
          success: false,
          message:
            "Account is temporarily locked due to too many failed login attempts. Please try again later.",
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: "Account is deactivated. Please contact support.",
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
          message: "Invalid credentials",
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

      // Generate tokens
      const tokens = this.generateTokens(user.userId);

      return {
        success: true,
        message: "Login successful",
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: new Date(),
        },
        tokens,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Login failed. Please try again.",
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
          message: "Invalid or expired verification token",
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
        message: "Email verified successfully",
      };
    } catch (error) {
      console.error("Email verification error:", error);
      return {
        success: false,
        message: "Email verification failed. Please try again.",
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
          message: "User not found",
        };
      }

      if (user.isEmailVerified) {
        return {
          success: false,
          message: "Email is already verified",
        };
      }

      // Generate new verification token
      const emailVerificationToken = this.generateRandomToken();
      const emailVerificationExpires = new Date(
        Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRES)
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
        message: "Verification email sent successfully",
      };
    } catch (error) {
      console.error("Resend verification error:", error);
      return {
        success: false,
        message: "Failed to resend verification email. Please try again.",
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
            "If an account with that email exists, a password reset link has been sent.",
        };
      }

      // Generate password reset token
      const passwordResetToken = this.generateRandomToken();
      const passwordResetExpires = new Date(
        Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRES)
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
          "If an account with that email exists, a password reset link has been sent.",
      };
    } catch (error) {
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: "Failed to process password reset request. Please try again.",
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
          message: "Invalid or expired password reset token",
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
        message: "Password reset successfully",
      };
    } catch (error) {
      console.error("Reset password error:", error);
      return {
        success: false,
        message: "Password reset failed. Please try again.",
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
          message: "User not found",
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
          message: "Current password is incorrect",
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
        message: "Password changed successfully",
      };
    } catch (error) {
      console.error("Change password error:", error);
      return {
        success: false,
        message: "Password change failed. Please try again.",
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
          message: "Invalid refresh token",
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
        message: "Invalid refresh token",
      };
    }
  }
}

export default new AuthService();
