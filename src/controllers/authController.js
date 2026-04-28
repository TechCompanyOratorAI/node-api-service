import { validationResult } from "express-validator";
import authService from "../services/authService.js";

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation thất bại",
          errors: errors.array(),
        });
      }

      const result = await authService.register(req.body);

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Register controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Register instructor
  async registerInstructor(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation thất bại",
          errors: errors.array(),
        });
      }

      const result = await authService.registerInstructor(req.body);

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Register instructor controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation thất bại",
          errors: errors.array(),
        });
      }

      const result = await authService.login(req.body);

      if (result.success) {
        // Set refresh token as httpOnly cookie
        res.cookie("refreshToken", result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // Remove refresh token from response body
        const responseData = { ...result };
        delete responseData.tokens.refreshToken;

        return res.status(200).json(responseData);
      } else {
        return res.status(401).json(result);
      }
    } catch (error) {
      console.error("Login controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      return res.status(200).json({
        success: true,
        message: "Logged out thành công",
      });
    } catch (error) {
      console.error("Logout controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
        });
      }

      const result = await authService.verifyEmail(token);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Verify email controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Resend verification email
  async resendVerificationEmail(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation thất bại",
          errors: errors.array(),
        });
      }

      const { email } = req.body;
      const result = await authService.resendVerificationEmail(email);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Resend verification controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Forgot password
  async forgotPassword(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation thất bại",
          errors: errors.array(),
        });
      }

      const { email } = req.body;
      const result = await authService.forgotPassword(email);

      // Always return success for security reasons
      return res.status(200).json({
        success: true,
        message:
          "Có lỗi xảy ra",
      });
    } catch (error) {
      console.error("Forgot password controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation thất bại",
          errors: errors.array(),
        });
      }

      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Reset password controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Change password (for authenticated users)
  async changePassword(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation thất bại",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId; // From auth middleware

      const result = await authService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Change password controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Có lỗi xảy ra",
        });
      }

      const result = await authService.refreshToken(refreshToken);

      if (result.success) {
        // Set new refresh token as httpOnly cookie
        res.cookie("refreshToken", result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // Remove refresh token from response body
        const responseData = { ...result };
        delete responseData.tokens.refreshToken;

        return res.status(200).json(responseData);
      } else {
        // Clear invalid refresh token
        res.clearCookie("refreshToken");
        return res.status(401).json(result);
      }
    } catch (error) {
      console.error("Refresh token controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId; // From auth middleware

      // You can fetch additional user data here if needed
      return res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (error) {
      console.error("Get profile controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }
}

export default new AuthController();
