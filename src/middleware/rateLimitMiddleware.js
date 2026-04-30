import rateLimit from 'express-rate-limit';

// General API rate limit
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Disabled: no effective limit
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Disabled: no effective limit
  message: {
    success: false,
    message: 'Too many authentication attempts, vui lòng try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for password reset (DISABLED)
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000, // Disabled: no effective limit
  message: {
    success: false,
    message: 'Too many mật khẩu reset attempts, vui lòng try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for email verification (DISABLED)
export const emailVerificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000, // Disabled: no effective limit
  message: {
    success: false,
    message: 'Too many email verification attempts, vui lòng try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  emailVerificationRateLimit
};
