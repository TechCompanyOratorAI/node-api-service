import { body } from 'express-validator';

// Registration validation
export const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('firstName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters')
    .trim(),

  body('lastName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters')
    .trim()
];

// Login validation
export const validateLogin = [
  body('emailOrUsername')
    .notEmpty()
    .withMessage('Email or username is required')
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Email validation
export const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Password reset validation
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Change password validation
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// Course validation
export const validateCourse = [
  body('courseCode')
    .isLength({ min: 2, max: 30 })
    .withMessage('Course code must be between 2 and 30 characters')
    .trim(),

  body('courseName')
    .isLength({ min: 3, max: 200 })
    .withMessage('Course name must be between 3 and 200 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters')
    .trim(),

  body('semester')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Semester must be less than 30 characters')
    .trim(),

  body('academicYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Academic year must be a valid year between 2000 and 2100'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        const start = new Date(req.body.startDate);
        const end = new Date(value);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    })
];

// Course update validation (all fields optional)
export const validateCourseUpdate = [
  body('courseCode')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('Course code must be between 2 and 30 characters')
    .trim(),

  body('courseName')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Course name must be between 3 and 200 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters')
    .trim(),

  body('semester')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Semester must be less than 30 characters')
    .trim(),

  body('academicYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Academic year must be a valid year between 2000 and 2100'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Topic validation
export const validateTopic = [
  body('topicName')
    .isLength({ min: 3, max: 200 })
    .withMessage('Topic name must be between 3 and 200 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters')
    .trim(),

  body('sequenceNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sequence number must be a positive integer'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),

  body('maxDurationMinutes')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Max duration must be between 1 and 300 minutes'),

  body('requirements')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Requirements must be less than 5000 characters')
    .trim()
];

// Topic update validation (all fields optional)
export const validateTopicUpdate = [
  body('topicName')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Topic name must be between 3 and 200 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters')
    .trim(),

  body('sequenceNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sequence number must be a positive integer'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),

  body('maxDurationMinutes')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Max duration must be between 1 and 300 minutes'),

  body('requirements')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Requirements must be less than 5000 characters')
    .trim()
];

export default {
  validateRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateChangePassword,
  validateCourse,
  validateCourseUpdate,
  validateTopic,
  validateTopicUpdate
};