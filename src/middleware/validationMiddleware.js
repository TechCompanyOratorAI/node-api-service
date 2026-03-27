import { body, param } from "express-validator";

// Registration validation
export const validateRegistration = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("firstName")
    .optional()
    .isLength({ max: 100 })
    .withMessage("First name must be less than 100 characters")
    .trim(),

  body("lastName")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Last name must be less than 100 characters")
    .trim(),
];

export const validateInstructorRegistration = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 100 })
    .withMessage("First name must be less than 100 characters")
    .trim(),

  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 100 })
    .withMessage("Last name must be less than 100 characters")
    .trim(),

  body("studyMajor")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Study major must be between 2 and 255 characters")
    .trim(),
];

// Login validation
export const validateLogin = [
  body("emailOrUsername")
    .notEmpty()
    .withMessage("Email or username is required")
    .trim(),

  body("password").notEmpty().withMessage("Password is required"),
];

// Email validation
export const validateEmail = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

// Password reset validation
export const validatePasswordReset = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
];

// Change password validation
export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),
];

// Course validation
export const validateCourse = [
  body("courseCode")
    .isLength({ min: 2, max: 30 })
    .withMessage("Course code must be between 2 and 30 characters")
    .trim(),

  body("courseName")
    .isLength({ min: 3, max: 200 })
    .withMessage("Course name must be between 3 and 200 characters")
    .trim(),

  body("majorCode")
    .optional()
    .isLength({ min: 2, max: 20 })
    .withMessage("Major code must be between 2 and 20 characters")
    .trim()
    .toUpperCase(),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters")
    .trim(),

  body("semester")
    .optional()
    .isLength({ max: 30 })
    .withMessage("Semester must be less than 30 characters")
    .trim(),

  body("academicYear")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Academic year must be a valid year between 2000 and 2100"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        const start = new Date(req.body.startDate);
        const end = new Date(value);
        if (end <= start) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),
];

// Course update validation (all fields optional)
export const validateCourseUpdate = [
  body("courseCode")
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage("Course code must be between 2 and 30 characters")
    .trim(),

  body("courseName")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Course name must be between 3 and 200 characters")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters")
    .trim(),

  body("semester")
    .optional()
    .isLength({ max: 30 })
    .withMessage("Semester must be less than 30 characters")
    .trim(),

  body("academicYear")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Academic year must be a valid year between 2000 and 2100"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  body("departmentId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Department ID must be a positive integer"),

  body("instructorIds")
    .optional()
    .isArray()
    .withMessage("Instructor IDs must be an array"),

  body("instructorIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each instructor ID must be a positive integer"),
];

// Topic validation
export const validateTopic = [
  body("topicName")
    .isLength({ min: 3, max: 200 })
    .withMessage("Topic name must be between 3 and 200 characters")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters")
    .trim(),

  body("sequenceNumber")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Sequence number must be a positive integer"),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date"),

  body("maxDurationMinutes")
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage("Max duration must be between 1 and 300 minutes"),

  body("requirements")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Requirements must be less than 5000 characters")
    .trim(),
];

// Topic update validation (all fields optional)
export const validateTopicUpdate = [
  body("topicName")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Topic name must be between 3 and 200 characters")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters")
    .trim(),

  body("sequenceNumber")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Sequence number must be a positive integer"),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date"),

  body("maxDurationMinutes")
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage("Max duration must be between 1 and 300 minutes"),

  body("requirements")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Requirements must be less than 5000 characters")
    .trim(),
];

// Presentation creation validation
export const validatePresentationCreate = [
  body("topicId")
    .isInt({ min: 1 })
    .withMessage("topicId must be a valid integer"),
  body("title")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters")
    .trim(),
  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters")
    .trim(),
  body("groupCode")
    .optional()
    .isLength({ max: 50 })
    .withMessage("groupCode must be less than 50 characters")
    .trim(),
];

// Presentation update validation
export const validatePresentationUpdate = [
  body("title")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters")
    .trim(),
  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters")
    .trim(),
  body("groupCode")
    .optional()
    .isLength({ max: 50 })
    .withMessage("groupCode must be less than 50 characters")
    .trim(),
];

// ============================================================================
// Class & Enrollment Validation (NEW)
// ============================================================================

// Class creation validation
export const validateCreateClass = [
  param("courseId")
    .isInt({ min: 1 })
    .withMessage("ID khóa học phải là số nguyên hợp lệ"),

  body("classCode")
    .trim()
    .notEmpty()
    .withMessage("Mã lớp học là bắt buộc")
    .isLength({ min: 1, max: 50 })
    .withMessage("Mã lớp học phải từ 1 đến 50 ký tự")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Mã lớp học chỉ được chứa chữ cái, số, gạch ngang và gạch dưới"
    ),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Ngày bắt đầu phải là định dạng ngày hợp lệ"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("Ngày kết thúc phải là định dạng ngày hợp lệ")
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        const start = new Date(req.body.startDate);
        const end = new Date(value);
        if (end <= start) {
          throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
        }
      }
      return true;
    }),

  // Enrollment key fields (required)
  body("enrollKey")
    .trim()
    .notEmpty()
    .withMessage("Mã đăng ký là bắt buộc")
    .isLength({ min: 6, max: 50 })
    .withMessage("Mã đăng ký phải từ 6-50 ký tự"),

  body("keyExpiresAt")
    .optional()
    .isISO8601()
    .withMessage("Ngày hết hạn mã phải là định dạng ngày hợp lệ"),

  body("keyMaxUses")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lượng sử dụng tối đa phải là số nguyên dương"),

  body("maxStudents")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lượng sinh viên tối đa phải là số nguyên dương"),

  body("maxGroupMembers")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lượng thành viên nhóm tối đa phải là số nguyên dương"),

  body("status")
    .optional()
    .isIn(["active", "closed", "archived"])
    .withMessage("Trạng thái phải là: active, closed hoặc archived"),
];

// Class update validation
export const validateUpdateClass = [
  body("classCode")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Mã lớp học phải từ 1 đến 50 ký tự")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Mã lớp học chỉ được chứa chữ cái, số, gạch ngang và gạch dưới"
    ),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Ngày bắt đầu phải là định dạng ngày hợp lệ"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("Ngày kết thúc phải là định dạng ngày hợp lệ")
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        const start = new Date(req.body.startDate);
        const end = new Date(value);
        if (end <= start) {
          throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
        }
      }
      return true;
    }),

  body("maxStudents")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lượng sinh viên tối đa phải là số nguyên dương"),

  body("maxGroupMembers")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lượng thành viên nhóm tối đa phải là số nguyên dương"),

  body("status")
    .optional()
    .isIn(["active", "closed", "archived"])
    .withMessage("Trạng thái phải là: active, closed hoặc archived"),

  // Enrollment key update fields (optional)
  body("enrollKey")
    .optional()
    .trim()
    .isLength({ min: 6, max: 50 })
    .withMessage("Mã đăng ký phải từ 6-50 ký tự"),

  body("keyExpiresAt")
    .optional()
    .isISO8601()
    .withMessage("Ngày hết hạn mã đăng ký phải là định dạng ngày hợp lệ"),

  body("keyMaxUses")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lần sử dụng tối đa phải là số nguyên dương"),
];

// Enrollment key creation validation
export const validateCreateKey = [
  body("customKey")
    .optional()
    .isString()
    .isLength({ min: 6, max: 50 })
    .withMessage("Mã tham gia tùy chỉnh phải có từ 6-50 ký tự"),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Ngày hết hạn phải là định dạng ngày hợp lệ")
    .custom((value) => {
      if (value) {
        const expiry = new Date(value);
        const now = new Date();
        if (expiry <= now) {
          throw new Error("Ngày hết hạn phải sau thời điểm hiện tại");
        }
      }
      return true;
    }),

  body("maxUses")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lần sử dụng tối đa phải là số nguyên dương"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Mô tả không được vượt quá 500 ký tự")
    .trim(),
];

// Student join class validation
export const validateJoinClass = [
  body("classId")
    .isInt({ min: 1 })
    .withMessage("classId phải là số nguyên dương"),

  body("enrollKey")
    .trim()
    .notEmpty()
    .withMessage("Mã tham gia lớp học là bắt buộc")
    .isLength({ min: 6, max: 50 })
    .withMessage("Mã tham gia phải có từ 6-50 ký tự"),
];

// Assign instructor validation
export const validateAssignInstructor = [
  body("instructorId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID giảng viên phải là số nguyên hợp lệ"),
  body("instructorIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage(
      "Danh sách ID giảng viên phải là mảng và có ít nhất 1 phần tử"
    ),
  body("instructorIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Mỗi ID giảng viên phải là số nguyên hợp lệ"),
  body().custom((value) => {
    if (!value.instructorId && !value.instructorIds) {
      throw new Error("Phải cung cấp instructorId hoặc instructorIds");
    }
    if (value.instructorId && value.instructorIds) {
      throw new Error(
        "Chỉ cung cấp instructorId hoặc instructorIds, không cả hai"
      );
    }
    return true;
  }),
];

// ============================================================
// Rubric-based AI Reporting Validators
// ============================================================

// RubricTemplate validation
export const validateRubricTemplate = [
  body("templateName")
    .notEmpty()
    .withMessage("Tên template là bắt buộc")
    .isLength({ max: 200 })
    .withMessage("Tên template không được quá 200 ký tự")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Mô tả không được quá 2000 ký tự"),

  body("assignmentType")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Loại assignment không được quá 50 ký tự"),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault phải là giá trị boolean"),
];

// RubricCriteria validation
export const validateRubricCriteria = [
  body("criteriaName")
    .notEmpty()
    .withMessage("Tên criteria là bắt buộc")
    .isLength({ max: 200 })
    .withMessage("Tên criteria không được quá 200 ký tự")
    .trim(),

  body("criteriaDescription")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Mô tả criteria không được quá 2000 ký tự"),

  body("weight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Weight phải lớn hơn hoặc bằng 0"),

  body("maxScore")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("maxScore phải lớn hơn 0"),

  body("displayOrder")
    .optional()
    .isInt({ min: 1 })
    .withMessage("displayOrder phải lớn hơn hoặc bằng 1"),

  body("evaluationGuide")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Hướng dẫn đánh giá không được quá 5000 ký tự"),
];

// ClassAISettings validation
export const validateClassAISetting = [
  body("rubricTemplateId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID rubric template phải là số nguyên hợp lệ"),

  body("enableAiReport")
    .optional()
    .isBoolean()
    .withMessage("enableAiReport phải là giá trị boolean"),

  body("requireInstructorConfirmation")
    .optional()
    .isBoolean()
    .withMessage("requireInstructorConfirmation phải là giá trị boolean"),

  body("allowInstructorEdit")
    .optional()
    .isBoolean()
    .withMessage("allowInstructorEdit phải là giá trị boolean"),

  body("feedbackLanguage")
    .optional()
    .isLength({ max: 10 })
    .withMessage("Ngôn ngữ feedback không được quá 10 ký tự"),

  body("reportFormat")
    .optional()
    .isIn(["brief", "detailed", "comprehensive"])
    .withMessage("reportFormat phải là brief, detailed hoặc comprehensive"),

  body("includeCriterionComments")
    .optional()
    .isBoolean()
    .withMessage("includeCriterionComments phải là giá trị boolean"),

  body("includeOverallSummary")
    .optional()
    .isBoolean()
    .withMessage("includeOverallSummary phải là giá trị boolean"),

  body("includeSuggestions")
    .optional()
    .isBoolean()
    .withMessage("includeSuggestions phải là giá trị boolean"),
];

// ClassRubricCriteria validation (for copied or edited criteria)
export const validateClassRubricCriteria = [
  body("criteriaName")
    .notEmpty()
    .withMessage("Tên criteria là bắt buộc")
    .isLength({ max: 150 })
    .withMessage("Tên criteria không được quá 150 ký tự")
    .trim(),

  body("criteriaDescription")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Mô tả criteria không được quá 2000 ký tự"),

  body("weight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Weight phải lớn hơn hoặc bằng 0"),

  body("maxScore")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("maxScore phải lớn hơn 0"),

  body("displayOrder")
    .optional()
    .isInt({ min: 1 })
    .withMessage("displayOrder phải lớn hơn hoặc bằng 1"),

  body("evaluationGuide")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Hướng dẫn đánh giá không được quá 5000 ký tự"),

  body("isActive")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("isActive phải là 0 hoặc 1"),
];

// Custom class criterion validation (for manually created criteria)
export const validateClassRubricCustomCriteria = [
  body("criteriaName")
    .notEmpty()
    .withMessage("Tên criteria là bắt buộc")
    .isLength({ max: 150 })
    .withMessage("Tên criteria không được quá 150 ký tự")
    .trim(),

  body("criteriaDescription")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Mô tả criteria không được quá 2000 ký tự"),

  body("weight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Weight phải lớn hơn hoặc bằng 0"),

  body("maxScore")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("maxScore phải lớn hơn 0"),

  body("displayOrder")
    .optional()
    .isInt({ min: 1 })
    .withMessage("displayOrder phải lớn hơn hoặc bằng 1"),

  body("evaluationGuide")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Hướng dẫn đánh giá không được quá 5000 ký tự"),

  body("rubricTemplateId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID rubric template phải là số nguyên hợp lệ"),
];

// Generate AI Report validation
export const validateGenerateAIReport = [
  body("submissionId")
    .notEmpty()
    .withMessage("submissionId là bắt buộc")
    .isInt({ min: 1 })
    .withMessage("submissionId phải là số nguyên hợp lệ"),

  body("classId")
    .notEmpty()
    .withMessage("classId là bắt buộc")
    .isInt({ min: 1 })
    .withMessage("classId phải là số nguyên hợp lệ"),
];

// Edit AI Report validation
export const validateEditAIReport = [
  body("overallScore")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("overallScore phải lớn hơn hoặc bằng 0"),

  body("criterionScores")
    .optional()
    .isObject()
    .withMessage("criterionScores phải là object"),

  body("reportContent")
    .optional()
    .isLength({ max: 10000 })
    .withMessage("Nội dung report không được quá 10000 ký tự"),

  body("reportStatus")
    .optional()
    .isIn(["waiting", "draft", "pending_review", "generating", "completed", "failed", "confirmed", "rejected"])
    .withMessage("reportStatus không hợp lệ"),
];

// Update AI Report status only (PATCH /ai-reports/:reportId/status)
const VALID_AI_REPORT_STATUSES = [
  "waiting",
  "draft",
  "pending_review",
  "generating",
  "completed",
  "failed",
  "confirmed",
  "rejected",
];
export const validateUpdateAIReportStatus = [
  body("reportStatus")
    .notEmpty()
    .withMessage("reportStatus là bắt buộc")
    .isIn(VALID_AI_REPORT_STATUSES)
    .withMessage("reportStatus không hợp lệ"),
];

export default {
  validateRegistration,
  validateInstructorRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateChangePassword,
  validateCourse,
  validateCourseUpdate,
  validateTopic,
  validateTopicUpdate,
  validatePresentationCreate,
  validatePresentationUpdate,
  validateCreateClass,
  validateUpdateClass,
  validateCreateKey,
  validateJoinClass,
  validateAssignInstructor,
  validateRubricTemplate,
  validateRubricCriteria,
  validateClassAISetting,
  validateClassRubricCriteria,
  validateClassRubricCustomCriteria,
  validateGenerateAIReport,
  validateEditAIReport,
  validateUpdateAIReportStatus,
};
