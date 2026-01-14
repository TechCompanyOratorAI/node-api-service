import emailService from '../services/emailService.js';
import db from '../models/index.js';

const { User } = db;

class EmailController {
  // Test email connection
  async testConnection(req, res) {
    try {
      const result = await emailService.testConnection();
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Email service is working properly'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Email service connection failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Email test controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
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
          message: 'Email, subject, and message are required'
        });
      }

      const result = await emailService.sendNotificationEmail(
        email,
        subject,
        message,
        'Test User',
        'testuser'
      );

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Test email sent successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to send test email',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Send test email controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
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
          message: 'User not found'
        });
      }

      if (!user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'User email is not verified yet'
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
          message: 'Welcome email sent successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to send welcome email',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Resend welcome email controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new EmailController();