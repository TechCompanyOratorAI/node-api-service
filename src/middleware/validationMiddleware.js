import { body, param } from "express-validator";

// Registration validation
export const validateRegistration = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Tên đăng nhập phải từ 3 đến 50 ký tự")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới"),

  body("email")
    .isEmail()
    .withMessage("Vui lòng cung cấp địa chỉ email hợp lệ")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt"
    ),

  body("firstName")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Tên không được vượt quá 100 ký tự")
    .trim(),

  body("lastName")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Họ không được vượt quá 100 ký tự")
    .trim(),
];

export const validateInstructorRegistration = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Tên đăng nhập phải từ 3 đến 50 ký tự")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới"),

  body("email")
    .isEmail()
    .withMessage("Vui lòng cung cấp địa chỉ email hợp lệ")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt"
    ),

  body("firstName")
    .notEmpty()
    .withMessage("Tên là bắt buộc")
    .isLength({ max: 100 })
    .withMessage("Tên không được vượt quá 100 ký tự")
    .trim(),

  body("lastName")
    .notEmpty()
    .withMessage("Họ là bắt buộc")
    .isLength({ max: 100 })
    .withMessage("Họ không được vượt quá 100 ký tự")
    .trim(),

  body("studyMajor")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Chuyên ngành phải từ 2 đến 255 ký tự")
    .trim(),
];

// Login validation
export const validateLogin = [
  body("emailOrUsername")
    .notEmpty()
    .withMessage("Email hoặc tên đăng nhập là bắt buộc")
    .trim(),

  body("password").notEmpty().withMessage("Mật khẩu là bắt buộc"),

  body("selectedRole")
    .optional()
    .isIn(["Student", "Instructor", "Admin"])
    .withMessage("Vai trò được chọn không hợp lệ"),
];

// Email validation
export const validateEmail = [
  body("email")
    .isEmail()
    .withMessage("Vui lòng cung cấp địa chỉ email hợp lệ")
    .normalizeEmail(),
];

// Password reset validation
export const validatePasswordReset = [
  body("token").notEmpty().withMessage("Token đặt lại mật khẩu là bắt buộc"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt"
    ),
];

// Change password validation
export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Mật khẩu hiện tại là bắt buộc"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu mới phải có ít nhất 8 ký tự")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]/
    )
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại");
      }
      return true;
    }),
];

// Course validation
export const validateCourse = [
  body("courseCode")
    .isLength({ min: 2, max: 30 })
    .withMessage("Mã môn học phải từ 2 đến 30 ký tự")
    .trim(),

  body("courseName")
    .isLength({ min: 3, max: 200 })
    .withMessage("Tên môn học phải từ 3 đến 200 ký tự")
    .trim(),

  body("majorCode")
    .optional()
    .isLength({ min: 2, max: 20 })
    .withMessage("Mã chuyên ngành phải từ 2 đến 20 ký tự")
    .trim()
    .toUpperCase(),

  body("majorId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("majorId phải là số nguyên dương"),

  body("subjectAreaId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("subjectAreaId phải là số nguyên dương"),

  body("subjectAreaIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("subjectAreaIds phải là mảng không rỗng"),

  body("subjectAreaIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each subjectAreaId phải là số nguyên dương"),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự")
    .trim(),

  body("majorId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("majorId phải là số nguyên dương"),

  body("subjectAreaId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("subjectAreaId phải là số nguyên dương"),

  body("semester")
    .optional()
    .isLength({ max: 30 })
    .withMessage("Học kỳ không được vượt quá 30 ký tự")
    .trim(),

  body("academicYear")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Năm học phải là năm hợp lệ trong khoảng 2000 đến 2100"),

  body("academicBlockId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Academic block ID phải là số nguyên dương"),

  body("academicBlockIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Academic block IDs phải là mảng không rỗng"),

  body("academicBlockIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each academic block ID phải là số nguyên dương"),

  body("subjectAreaIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("subjectAreaIds phải là mảng không rỗng"),

  body("subjectAreaIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each subjectAreaId phải là số nguyên dương"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date phải là ngày hợp lệ"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date phải là ngày hợp lệ")
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
];

// Course update validation (all fields optional)
export const validateCourseUpdate = [
  body("courseCode")
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage("Mã môn học phải từ 2 đến 30 ký tự")
    .trim(),

  body("courseName")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Tên môn học phải từ 3 đến 200 ký tự")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự")
    .trim(),

  body("semester")
    .optional()
    .isLength({ max: 30 })
    .withMessage("Học kỳ không được vượt quá 30 ký tự")
    .trim(),

  body("academicYear")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Năm học phải là năm hợp lệ trong khoảng 2000 đến 2100"),

  body("academicBlockId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Academic block ID phải là số nguyên dương"),

  body("academicBlockIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Academic block IDs phải là mảng không rỗng"),

  body("academicBlockIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each academic block ID phải là số nguyên dương"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date phải là ngày hợp lệ"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date phải là ngày hợp lệ"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive phải là giá trị boolean"),

  body("departmentId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Department ID phải là số nguyên dương"),

  body("instructorIds")
    .optional()
    .isArray()
    .withMessage("Danh sách ID giảng viên phải là mảng"),

  body("instructorIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each instructor ID phải là số nguyên dương"),
];

// Topic validation
export const validateTopic = [
  body("topicName")
    .isLength({ min: 3, max: 200 })
    .withMessage("Tên chủ đề phải từ 3 đến 200 ký tự")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự")
    .trim(),

  body("submissionStartDate")
    .optional()
    .isISO8601()
    .withMessage("submissionStartDate phải là ngày hợp lệ"),

  body("submissionDeadline")
    .optional()
    .isISO8601()
    .withMessage("submissionDeadline phải là ngày hợp lệ")
    .custom((value, { req }) => {
      const start = req.body.submissionStartDate;
      if (start && value && new Date(value) <= new Date(start)) {
        throw new Error("submissionDeadline phải sau submissionStartDate");
      }
      return true;
    }),

  body("minGroups")
    .optional()
    .isInt({ min: 1 })
    .withMessage("minGroups phải là số nguyên dương"),

  body("maxGroups")
    .optional()
    .isInt({ min: 1 })
    .withMessage("maxGroups phải là số nguyên dương")
    .custom((value, { req }) => {
      const min = req.body.minGroups;
      if (min !== undefined && value !== undefined && parseInt(value, 10) < parseInt(min, 10)) {
        throw new Error("maxGroups phải lớn hơn hoặc bằng minGroups");
      }
      return true;
    }),

  body("maxDurationMinutes")
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage("Thời lượng tối đa phải từ 1 đến 300 phút"),

  body("requirements")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Yêu cầu không được vượt quá 5000 ký tự")
    .trim(),
];

// Topic update validation (all fields optional)
export const validateTopicUpdate = [
  body("topicName")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Tên chủ đề phải từ 3 đến 200 ký tự")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự")
    .trim(),

  body("submissionStartDate")
    .optional()
    .isISO8601()
    .withMessage("submissionStartDate phải là ngày hợp lệ"),

  body("submissionDeadline")
    .optional()
    .isISO8601()
    .withMessage("submissionDeadline phải là ngày hợp lệ")
    .custom((value, { req }) => {
      const start = req.body.submissionStartDate;
      if (start && value && new Date(value) <= new Date(start)) {
        throw new Error("submissionDeadline phải sau submissionStartDate");
      }
      return true;
    }),

  body("minGroups")
    .optional()
    .isInt({ min: 1 })
    .withMessage("minGroups phải là số nguyên dương"),

  body("maxGroups")
    .optional()
    .isInt({ min: 1 })
    .withMessage("maxGroups phải là số nguyên dương")
    .custom((value, { req }) => {
      const min = req.body.minGroups;
      if (min !== undefined && value !== undefined && parseInt(value, 10) < parseInt(min, 10)) {
        throw new Error("maxGroups phải lớn hơn hoặc bằng minGroups");
      }
      return true;
    }),

  body("maxDurationMinutes")
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage("Thời lượng tối đa phải từ 1 đến 300 phút"),

  body("requirements")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Yêu cầu không được vượt quá 5000 ký tự")
    .trim(),
];

// Presentation creation validation
export const validatePresentationCreate = [
  body("topicId")
    .isInt({ min: 1 })
    .withMessage("topicId phải là số nguyên hợp lệ"),
  body("title")
    .isLength({ min: 1, max: 255 })
    .withMessage("Tiêu đề phải từ 1 đến 255 ký tự")
    .trim(),
  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự")
    .trim(),
  body("groupCode")
    .optional()
    .isLength({ max: 50 })
    .withMessage("groupCode không được vượt quá 50 ký tự")
    .trim(),
];

// Presentation update validation
export const validatePresentationUpdate = [
  body("title")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("Tiêu đề phải từ 1 đến 255 ký tự")
    .trim(),
  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự")
    .trim(),
  body("groupCode")
    .optional()
    .isLength({ max: 50 })
    .withMessage("groupCode không được vượt quá 50 ký tự")
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

  body("academicBlockId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Academic block ID phải là số nguyên dương"),

  body("academicBlockIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Academic block IDs must be a non-empty array"),

  body("academicBlockIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each academic block ID must be a positive integer"),

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
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Mã lớp học phải từ 1 đến 50 ký tự")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Mã lớp học chỉ được chứa chữ cái, số, gạch ngang và gạch dưới"
    ),

  body("startDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Ngày bắt đầu phải là định dạng ngày hợp lệ"),

  body("endDate")
    .optional({ nullable: true })
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

  body("academicBlockId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Academic block ID phải là số nguyên dương"),

  body("academicBlockIds")
    .optional({ nullable: true })
    .isArray({ min: 1 })
    .withMessage("Academic block IDs must be a non-empty array"),

  body("academicBlockIds.*")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Each academic block ID must be a positive integer"),

  body("maxStudents")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Số lượng sinh viên tối đa phải là số nguyên dương"),

  body("maxGroupMembers")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Số lượng thành viên nhóm tối đa phải là số nguyên dương"),

  body("status")
    .optional({ nullable: true })
    .isIn(["active", "closed", "archived"])
    .withMessage("Trạng thái phải là: active, closed hoặc archived"),

  // Enrollment key update fields (optional)
  body("enrollKey")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 6, max: 50 })
    .withMessage("Mã đăng ký phải từ 6-50 ký tự"),

  body("keyExpiresAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Ngày hết hạn mã đăng ký phải là định dạng ngày hợp lệ"),

  body("keyMaxUses")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Số lần sử dụng tối đa phải là số nguyên dương"),
];

// Enrollment key creation validation
export const validateCreateKey = [
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
];

// Student join class validation
export const validateJoinClass = [
  body("classId")
    .optional()
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
  body("overrideReason")
    .optional()
    .isLength({ min: 5, max: 2000 })
    .withMessage("overrideReason phải có độ dài từ 5 đến 2000 ký tự"),
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

  body("enableSlideLayoutScoring")
    .optional()
    .isBoolean()
    .withMessage("enableSlideLayoutScoring phải là giá trị boolean"),

  body("slideLayoutWeight")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("slideLayoutWeight phải từ 0 đến 1"),

  body("feedbackLanguage")
    .optional()
    .isLength({ max: 10 })
    .withMessage("Ngôn ngữ feedback không được quá 10 ký tự"),

  body("reportFormat")
    .optional()
    .isIn(["summary", "detailed"])
    .withMessage("reportFormat phải là summary hoặc detailed"),

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
// ─── Criterion Feedback ───────────────────────────────────────────────────────
export const validateGetCriterionFeedbacks = [
  param("reportId")
    .isInt({ min: 1 })
    .withMessage("reportId phải là số nguyên dương"),

  body("score")
    .optional()
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("score phải là số thập phân tối đa 2 chữ số sau dấu phẩy")
    .custom((v) => parseFloat(v) >= 0 && parseFloat(v) <= 100)
    .withMessage("score phải từ 0 đến 100"),

  body("comment")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("comment không được quá 2000 ký tự")
    .trim(),
];

export const validateCreateCriterionFeedback = [
  param("reportId")
    .isInt({ min: 1 })
    .withMessage("reportId phải là số nguyên dương"),

  body("classRubricCriteriaId")
    .notEmpty()
    .withMessage("classRubricCriteriaId là bắt buộc")
    .isInt({ min: 1 })
    .withMessage("classRubricCriteriaId phải là số nguyên dương"),

  body("score")
    .optional()
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("score phải là số thập phân tối đa 2 chữ số sau dấu phẩy")
    .custom((v) => parseFloat(v) >= 0 && parseFloat(v) <= 100)
    .withMessage("score phải từ 0 đến 100"),

  body("comment")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("comment không được quá 2000 ký tự")
    .trim(),
];

export const validateUpsertCriterionFeedback = [
  param("reportId")
    .isInt({ min: 1 })
    .withMessage("reportId phải là số nguyên dương"),

  param("classRubricCriteriaId")
    .isInt({ min: 1 })
    .withMessage("classRubricCriteriaId phải là số nguyên dương"),

  body("score")
    .optional()
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("score phải là số thập phân tối đa 2 chữ số sau dấu phẩy")
    .custom((v) => parseFloat(v) >= 0 && parseFloat(v) <= 100)
    .withMessage("score phải từ 0 đến 100"),

  body("comment")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("comment không được quá 2000 ký tự")
    .trim(),
];

export const validateDeleteCriterionFeedback = [
  param("reportId")
    .isInt({ min: 1 })
    .withMessage("reportId phải là số nguyên dương"),

  param("classRubricCriteriaId")
    .isInt({ min: 1 })
    .withMessage("classRubricCriteriaId phải là số nguyên dương"),

  body("score")
    .optional()
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("score phải là số thập phân tối đa 2 chữ số sau dấu phẩy")
    .custom((v) => parseFloat(v) >= 0 && parseFloat(v) <= 100)
    .withMessage("score phải từ 0 đến 100"),

  body("comment")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("comment không được quá 2000 ký tự")
    .trim(),
];

// ─── Share Invite Validation ─────────────────────────────────────────────────
export const validateShareInvite = [
  body("emails")
    .isArray({ min: 1, max: 50 })
    .withMessage("emails phải là mảng và có ít nhất 1 địa chỉ (tối đa 50)"),
  body("emails.*")
    .isEmail()
    .withMessage("Mỗi email phải là địa chỉ email hợp lệ")
    .normalizeEmail(),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("expiresAt phải là định dạng ngày hợp lệ (ISO 8601)")
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error("expiresAt phải là thời điểm trong tương lai");
      }
      return true;
    }),
];

// ─── Export Default ──────────────────────────────────────────────────────────
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
  validateGetCriterionFeedbacks,
  validateCreateCriterionFeedback,
  validateUpsertCriterionFeedback,
  validateDeleteCriterionFeedback,
  validateShareInvite,
};



