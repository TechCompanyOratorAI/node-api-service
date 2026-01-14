import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    // Check if email configuration exists
    this.isConfigured = !!(
      process.env.MAIL_HOST &&
      process.env.MAIL_USERNAME &&
      process.env.MAIL_PASSWORD
    );

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      });
    } else {
      this.transporter = null;
    }
  }

  // Send email function
  async sendEmail(to, subject, html) {
    if (!this.isConfigured) {
      return {
        success: true,
        message: "Email service not configured - email skipped",
      };
    }

    try {
      await this.transporter.sendMail({
        from: `${process.env.MAIL_FROM_NAME || "Orator AI"} <${
          process.env.MAIL_FROM_ADDRESS || "noreply@oratorai.com"
        }>`,
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, error: error.message };
    }
  }

  // Email verification template
  generateVerificationEmailHtml(firstName, username, verificationUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff; margin: 0;">Orator AI</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Nền tảng thuyết trình thông minh</p>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Chào mừng bạn đến với Orator AI!</h2>
          
          <p style="color: #555; line-height: 1.6;">Xin chào <strong>${
            firstName || username
          }</strong>,</p>
          
          <p style="color: #555; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản Orator AI. Để hoàn tất quá trình đăng ký, 
            vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Xác thực Email
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Nếu nút không hoạt động, bạn có thể sao chép và dán liên kết này vào trình duyệt:
          </p>
          <p style="word-break: break-all; color: #007bff; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 14px;">
            ${verificationUrl}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              <strong>Lưu ý:</strong> Liên kết xác thực này sẽ hết hạn sau 24 giờ.
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <div style="text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Trân trọng,<br>
              <strong>Đội ngũ Orator AI</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Password reset email template
  generatePasswordResetEmailHtml(firstName, username, resetUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc3545; margin: 0;">Orator AI</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Yêu cầu đặt lại mật khẩu</p>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Đặt lại mật khẩu</h2>
          
          <p style="color: #555; line-height: 1.6;">Xin chào <strong>${
            firstName || username
          }</strong>,</p>
          
          <p style="color: #555; line-height: 1.6;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Orator AI của bạn. 
            Nhấp vào nút bên dưới để tạo mật khẩu mới:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Đặt lại mật khẩu
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Nếu nút không hoạt động, bạn có thể sao chép và dán liên kết này vào trình duyệt:
          </p>
          <p style="word-break: break-all; color: #dc3545; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 14px;">
            ${resetUrl}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              <strong>Lưu ý:</strong> Liên kết đặt lại mật khẩu này sẽ hết hạn sau 1 giờ.
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <div style="text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Trân trọng,<br>
              <strong>Đội ngũ Orator AI</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Welcome email template (after email verification)
  generateWelcomeEmailHtml(firstName, username) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #28a745; margin: 0;">Orator AI</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Chào mừng bạn!</p>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Tài khoản đã được kích hoạt!</h2>
          
          <p style="color: #555; line-height: 1.6;">Xin chào <strong>${
            firstName || username
          }</strong>,</p>
          
          <p style="color: #555; line-height: 1.6;">
            Chúc mừng! Tài khoản Orator AI của bạn đã được kích hoạt thành công. 
            Bạn có thể bắt đầu sử dụng nền tảng để cải thiện kỹ năng thuyết trình của mình.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #333; margin-top: 0;">Bạn có thể làm gì với Orator AI?</h3>
            <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
              <li>Tạo và quản lý các bài thuyết trình</li>
              <li>Ghi âm và phân tích giọng nói</li>
              <li>Nhận phản hồi AI về kỹ năng thuyết trình</li>
              <li>Theo dõi tiến độ cải thiện</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Bắt đầu ngay
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <div style="text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Trân trọng,<br>
              <strong>Đội ngũ Orator AI</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Send verification email
  async sendVerificationEmail(email, firstName, username, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const html = this.generateVerificationEmailHtml(
      firstName,
      username,
      verificationUrl
    );

    return await this.sendEmail(
      email,
      "Xác thực địa chỉ email - Orator AI",
      html
    );
  }

  // Send password reset email
  async sendPasswordResetEmail(email, firstName, username, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = this.generatePasswordResetEmailHtml(
      firstName,
      username,
      resetUrl
    );

    return await this.sendEmail(email, "Đặt lại mật khẩu - Orator AI", html);
  }

  // Send welcome email
  async sendWelcomeEmail(email, firstName, username) {
    const html = this.generateWelcomeEmailHtml(firstName, username);

    return await this.sendEmail(email, "Chào mừng đến với Orator AI!", html);
  }

  // Send notification email (generic)
  async sendNotificationEmail(email, subject, message, firstName, username) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff; margin: 0;">Orator AI</h1>
          </div>
          
          <p style="color: #555; line-height: 1.6;">Xin chào <strong>${
            firstName || username
          }</strong>,</p>
          
          <div style="color: #555; line-height: 1.6; margin: 20px 0;">
            ${message}
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <div style="text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Trân trọng,<br>
              <strong>Đội ngũ Orator AI</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(email, subject, html);
  }

  // Test email connection
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        message:
          "Email service not configured. Please set MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD environment variables.",
      };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: "Email service connection successful" };
    } catch (error) {
      console.error("Email connection test failed:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();
