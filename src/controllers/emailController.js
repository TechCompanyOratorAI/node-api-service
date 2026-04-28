import emailService from "../services/emailService.js";
import db from "../models/index.js";

const { User } = db;

class EmailController {
  // Test email connection
  async testConnection(req, res) {
    try {
      const result = await emailService.testConnection();

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Kết nối email service thành công",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Email service connection thất bại",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Email test controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Send test email (admin only)
  async sendTestEmail(req, res) {
    try {
      const { email, subject, message } = req.body;

      if (!email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
        });
      }

      const result = await emailService.sendNotificationEmail(
        email,
        subject,
        message,
        "Test User",
        "testuser"
      );

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Test email sent thành công",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Thao tác thất bại",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Send test email controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }

  // Resend welcome email (admin only)
  async resendWelcomeEmail(req, res) {
    try {
      const { userId } = req.params;

      // Get user from database
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Người dùng không tìm thấy",
        });
      }

      if (!user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Người dùng chưa xác thực email",
        });
      }

      const result = await emailService.sendWelcomeEmail(
        user.email,
        user.firstName,
        user.username
      );

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Welcome email sent thành công",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Thao tác thất bại",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Resend welcome email controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
      });
    }
  }
}

export default new EmailController();
