import express from "express";
import emailController from "../controllers/emailController.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/authMiddleware.js";
import { body } from "express-validator";

const router = express.Router();

// Test email connection (admin only)
router.get(
  "/test-connection",
  authenticateToken,
  requireRole(["admin"]),
  emailController.testConnection
);

// Send test email (admin only)
router.post(
  "/send-test",
  authenticateToken,
  requireRole(["admin"]),
  [
    body("email").isEmail().withMessage("Email hợp lệ là bắt buộc"),
    body("subject").notEmpty().withMessage("Tiêu đề email là bắt buộc"),
    body("message").notEmpty().withMessage("Nội dung tin nhắn là bắt buộc"),
  ],
  emailController.sendTestEmail
);

// Resend welcome email for specific user (admin only)
router.post(
  "/resend-welcome/:userId",
  authenticateToken,
  requireRole(["admin"]),
  emailController.resendWelcomeEmail
);

export default router;
