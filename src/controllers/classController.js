"use strict";

const { validationResult } = require("express-validator");
const classService = require("../services/classService");
const multer = require("multer");
const XLSX = require("xlsx");
const {
  emitClassEvent,
  emitClassInstructorEvent,
} = require("../websocket/emitters");

// Multer in-memory storage for Excel uploads
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.match(/\.(xlsx|xls)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file Excel (.xlsx, .xls)"));
    }
  },
}).single("file");

class ClassController {
  async createClass(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      // Get courseId from URL params
      const { courseId } = req.params;

      // Validate courseId
      if (!courseId || isNaN(parseInt(courseId))) {
        return res.status(400).json({
          success: false,
          message: "ID khóa học không hợp lệ",
        });
      }

      const result = await classService.createClass(
        { ...req.body, courseId: parseInt(courseId) },
        req.user.userId,
        req.userRoles || []
      );

      if (result.success) {
        emitClassEvent("created", {
          actorUserId: req.user?.userId || null,
          classId: result.class?.classId,
          classData: result.class,
          courseId: parseInt(courseId),
        });
      }

      return res.status(result.success ? 201 : 400).json(result);

    } catch (error) {
      console.error("Create class controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Get all classes (Admin and Student)
  async getAllClasses(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      // Validate pagination params
      if (isNaN(page) || page < 1) {
        return res.status(400).json({
          success: false,
          message: "Tham số page không hợp lệ",
        });
      }
      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({
          success: false,
          message: "Tham số limit không hợp lệ",
        });
      }

      const search = req.query.search;
      const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;
      const userId = req.user.userId;
      const userRole =
        req.userRoles?.includes("Admin") || req.userRoles?.includes("AcademicCoordinator")
          ? "Admin"
          : req.userRoles?.includes("Instructor")
          ? "Instructor"
          : "Student";

      const result = await classService.getAllClasses({
        page,
        limit,
        search,
        courseId,
        userId,
        userRole,
      });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get all classes error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Get instructor's teaching classes
  async getMyTeachingClasses(req, res) {
    try {
      const instructorId = req.user.userId;
      const result = await classService.getMyTeachingClasses(instructorId);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get my teaching classes error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Get classes by course
  async getClassesByCourse(req, res) {
    try {
      const { courseId } = req.params;

      // Validate courseId
      if (!courseId || isNaN(parseInt(courseId))) {
        return res.status(400).json({
          success: false,
          message: "ID khóa học không hợp lệ",
        });
      }

      const userId = req.user.userId;
      // Get primary role from req.userRoles (set by requireRole middleware)
      const userRole = req.userRoles?.includes("Admin")
        || req.userRoles?.includes("AcademicCoordinator")
        ? "Admin"
        : req.userRoles?.includes("Instructor")
          ? "Instructor"
          : "Student";

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const result = await classService.getClassesByCourse(
        parseInt(courseId),
        userId,
        userRole,
        pagination
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Get classes by course error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Get class by ID
  async getClassById(req, res) {
    try {
      const { classId } = req.params;

      // Validate classId
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin")
        || req.userRoles?.includes("AcademicCoordinator")
        ? "Admin"
        : req.userRoles?.includes("Instructor")
          ? "Instructor"
          : "Student";

      const result = await classService.getClassById(
        parseInt(classId),
        userId,
        userRole
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        const status =
          result.message === "Bạn không có quyền truy cập lớp học này"
            ? 403
            : 404;
        return res.status(status).json(result);
      }
    } catch (error) {
      console.error("Get class by ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Update class
  async updateClass(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { classId } = req.params;

      // Validate classId
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin")
        || req.userRoles?.includes("AcademicCoordinator")
        ? "Admin"
        : req.userRoles?.includes("Instructor")
          ? "Instructor"
          : "Student";

      const normalizedUpdates = { ...req.body };
      if (
        normalizedUpdates.expiresAt !== undefined &&
        normalizedUpdates.keyExpiresAt === undefined
      ) {
        normalizedUpdates.keyExpiresAt = normalizedUpdates.expiresAt;
      }
      if (
        normalizedUpdates.maxUses !== undefined &&
        normalizedUpdates.keyMaxUses === undefined
      ) {
        normalizedUpdates.keyMaxUses = normalizedUpdates.maxUses;
      }

      Object.keys(normalizedUpdates).forEach((key) => {
        if (normalizedUpdates[key] === null || normalizedUpdates[key] === undefined) {
          delete normalizedUpdates[key];
        }
      });

      const result = await classService.updateClass(
        parseInt(classId),
        normalizedUpdates,
        userId,
        userRole
      );

      if (result.success) {
        emitClassEvent("updated", {
          actorUserId: req.user?.userId || null,
          classId: parseInt(classId),
          classData: result.class,
        });
      }

      if (result.success) {
        return res.status(200).json(result);
      } else {
        const status =
          result.message === "Bạn không có quyền truy cập lớp học này"
            ? 403
            : 400;
        return res.status(status).json(result);
      }
    } catch (error) {
      console.error("Update class error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Delete class
  async deleteClass(req, res) {
    try {
      const { classId } = req.params;

      // Validate classId
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const userId = req.user.userId;

      const result = await classService.deleteClass(parseInt(classId), userId);

      if (result.success) {
        emitClassEvent("deleted", {
          actorUserId: req.user?.userId || null,
          classId: parseInt(classId),
          archived: !!result.archived,
        });
      }

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Delete class error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Assign instructor to class
  async assignInstructor(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: errors.array(),
        });
      }

      const { classId } = req.params;

      // Validate classId
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const { instructorId, instructorIds, overrideReason } = req.body;
      const assignedBy = req.user.userId;

      // Handle single instructor
      if (instructorId) {
        const result = await classService.assignInstructor(
          parseInt(classId),
          parseInt(instructorId),
          assignedBy,
          {
            overrideReason,
            actorRoles: req.userRoles || [],
          }
        );

        if (result.success) {
          emitClassInstructorEvent("assigned", {
            actorUserId: req.user?.userId || null,
            classId: parseInt(classId),
            instructorId: parseInt(instructorId),
            assignmentStatus: result.assignmentStatus || null,
          });
          return res.status(200).json(result);
        } else {
          return res.status(400).json(result);
        }
      }

      // Handle multiple instructors
      if (instructorIds && Array.isArray(instructorIds)) {
        const results = {
          success: true,
          added: [],
          failed: [],
        };

        for (const id of instructorIds) {
          const result = await classService.assignInstructor(
            parseInt(classId),
            parseInt(id),
            assignedBy,
            {
              overrideReason,
              actorRoles: req.userRoles || [],
            }
          );

          if (result.success) {
            emitClassInstructorEvent("assigned", {
              actorUserId: req.user?.userId || null,
              classId: parseInt(classId),
              instructorId: parseInt(id),
              assignmentStatus: result.assignmentStatus || null,
            });
            results.added.push({ instructorId: id, message: result.message });
          } else {
            results.failed.push({ instructorId: id, error: result.message });
          }
        }

        // Overall success if at least one succeeded
        if (results.added.length === 0) {
          results.success = false;
          results.message = "Không thể thêm giảng viên nào";
        } else {
          results.message = `Đã thêm ${results.added.length}/${instructorIds.length} giảng viên`;
        }

        return res.status(results.success ? 200 : 400).json(results);
      }
    } catch (error) {
      console.error("Assign instructor error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Remove instructor from class
  async removeInstructor(req, res) {
    try {
      const { classId, instructorId } = req.params;

      // Validate classId and instructorId
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }
      if (!instructorId || isNaN(parseInt(instructorId))) {
        return res.status(400).json({
          success: false,
          message: "ID giảng viên không hợp lệ",
        });
      }

      const result = await classService.removeInstructor(
        parseInt(classId),
        parseInt(instructorId),
        req.user.userId
      );

      if (result.success) {
        emitClassInstructorEvent("removed", {
          actorUserId: req.user?.userId || null,
          classId: parseInt(classId),
          instructorId: parseInt(instructorId),
        });
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error("Remove instructor error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // Get class instructors
  async getClassInstructors(req, res) {
    try {
      const { classId } = req.params;
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({ success: false, message: "ID lớp học không hợp lệ" });
      }

      const db = require("../models");
      const { ClassInstructor, User } = db;

      const instructors = await ClassInstructor.findAll({
        where: { classId: parseInt(classId) },
        include: [
          {
            model: User,
            as: "instructor",
            attributes: ["userId", "username", "firstName", "lastName", "email"],
          },
        ],
      });

      return res.status(200).json({
        success: true,
        data: instructors.map((ci) => ({
          ...ci.instructor.toJSON(),
          assignedAt: ci.assignedAt,
        })),
      });
    } catch (error) {
      console.error("Get class instructors error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  // ============================================================
  // TOPIC HANDLERS (per-class)
  // ============================================================

  // POST /api/classes/:classId/topics
  async createTopic(req, res) {
    try {
      const { classId } = req.params;
      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin") ? "Admin" : "Instructor";
      const result = await classService.createTopic(parseInt(classId), req.body, userId, userRole);
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error("Create topic error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  // GET /api/classes/:classId/topics
  async getTopicsByClass(req, res) {
    try {
      const { classId } = req.params;
      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin")
        ? "Admin" : req.userRoles?.includes("Instructor") ? "Instructor" : "Student";
      const result = await classService.getTopicsByClass(parseInt(classId), userId, userRole);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Get topics error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  // PATCH /api/classes/topics/:topicId
  async updateTopic(req, res) {
    try {
      const { topicId } = req.params;
      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin") ? "Admin" : "Instructor";
      const result = await classService.updateTopic(parseInt(topicId), req.body, userId, userRole);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Update topic error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  // DELETE /api/classes/topics/:topicId
  async deleteTopic(req, res) {
    try {
      const { topicId } = req.params;
      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin") ? "Admin" : "Instructor";
      const result = await classService.deleteTopic(parseInt(topicId), userId, userRole);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Delete topic error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  // ============================================================
  // UPLOAD PERMISSION HANDLERS
  // ============================================================

  // POST /api/classes/:classId/upload-permission - Bật/tắt cho phép upload
  async setUploadPermission(req, res) {
    try {
      const { classId } = req.params;
      const { isUploadEnabled, uploadStartDate, uploadEndDate } = req.body;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const instructorId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin")
        ? "Admin"
        : req.userRoles?.includes("Instructor")
          ? "Instructor"
          : null;

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: "Chỉ giảng viên hoặc admin mới có quyền thực hiện",
        });
      }

      const result = await classService.setUploadPermission(
        parseInt(classId),
        {
          isUploadEnabled: isUploadEnabled ?? true,
          uploadStartDate: uploadStartDate || null,
          uploadEndDate: uploadEndDate || null,
        },
        instructorId,
        userRole
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Set upload permission error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // GET /api/classes/:classId/upload-permission - Lấy trạng thái upload
  async getUploadPermission(req, res) {
    try {
      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const result = await classService.getUploadPermission(parseInt(classId));
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Get upload permission error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  // ============================================================
  // EMAIL WHITELIST HANDLERS
  // ============================================================

  /**
   * POST /api/classes/:classId/email-whitelist
   * Upload Excel file và lưu danh sách email (replace toàn bộ)
   */
  uploadClassEmailWhitelist(req, res) {
    excelUpload(req, res, async (uploadErr) => {
      if (uploadErr) {
        return res.status(400).json({
          success: false,
          message: uploadErr.message || "Lỗi khi upload file",
        });
      }

      try {
        const { classId } = req.params;
        if (!classId || isNaN(parseInt(classId))) {
          return res.status(400).json({
            success: false,
            message: "ID lớp học không hợp lệ",
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "Vui lòng chọn file Excel",
          });
        }

        // Parse Excel file from buffer
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract emails: look for header row with "email" then collect values
        // Also support: first row might already be emails (no header)
        let emails = [];
        let emailColIndex = -1;

        // Find email column (case-insensitive header)
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            if (
              row[j] &&
              String(row[j]).toLowerCase().trim() === "email"
            ) {
              emailColIndex = j;
              // Collect emails from rows below header
              for (let k = i + 1; k < rows.length; k++) {
                const val = rows[k] && rows[k][emailColIndex];
                if (val && String(val).trim()) {
                  emails.push(String(val).trim().toLowerCase());
                }
              }
              break;
            }
          }
          if (emailColIndex !== -1) break;
        }

        // Fallback: no header found — try first column of all rows
        if (emailColIndex === -1) {
          for (const row of rows) {
            if (!Array.isArray(row)) continue;
            const val = row[0];
            if (val && String(val).trim()) {
              emails.push(String(val).trim().toLowerCase());
            }
          }
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        emails = [...new Set(emails)].filter((e) => emailRegex.test(e));

        if (emails.length === 0) {
          return res.status(400).json({
            success: false,
            message:
              "Không tìm thấy email hợp lệ trong file. Đảm bảo file có cột 'email' hoặc cột đầu tiên chứa địa chỉ email.",
          });
        }

        const userId = req.user.userId;
        const userRole = req.userRoles?.includes("Admin")
          ? "Admin"
          : req.userRoles?.includes("Instructor")
          ? "Instructor"
          : null;

        const result = await classService.setEmailWhitelist(
          parseInt(classId),
          emails,
          userId,
          userRole
        );

        return res.status(result.success ? 200 : 400).json(result);
      } catch (error) {
        console.error("Upload email whitelist error:", error);
        return res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
        });
      }
    });
  }

  /**
   * GET /api/classes/:classId/email-whitelist
   * Lấy danh sách email whitelist của lớp
   */
  async getClassEmailWhitelist(req, res) {
    try {
      const { classId } = req.params;
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const result = await classService.getEmailWhitelist(parseInt(classId));
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Get email whitelist error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * DELETE /api/classes/:classId/email-whitelist
   * Xóa toàn bộ whitelist (tắt tính năng lọc email)
   */
  async deleteClassEmailWhitelist(req, res) {
    try {
      const { classId } = req.params;
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin")
        ? "Admin"
        : req.userRoles?.includes("Instructor")
        ? "Instructor"
        : null;

      const result = await classService.deleteEmailWhitelist(
        parseInt(classId),
        userId,
        userRole
      );
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Delete email whitelist error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * POST /api/classes/:classId/email-whitelist/add
   * Thêm lẻ 1 email vào whitelist
   */
  async addSingleEmailToWhitelist(req, res) {
    try {
      const { classId } = req.params;
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({ success: false, message: "ID lớp học không hợp lệ" });
      }
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Vui lòng cung cấp email" });
      }

      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin") ? "Admin"
        : req.userRoles?.includes("Instructor") ? "Instructor" : null;

      const result = await classService.addSingleEmail(parseInt(classId), email, userId, userRole);
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error("Add single email whitelist error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  /**
   * PATCH /api/classes/:classId/email-whitelist/update
   * Sửa 1 email trong whitelist
   */
  async updateSingleEmailInWhitelist(req, res) {
    try {
      const { classId } = req.params;
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({ success: false, message: "ID lớp học không hợp lệ" });
      }
      const { oldEmail, newEmail } = req.body;
      if (!oldEmail || !newEmail) {
        return res.status(400).json({ success: false, message: "Vui lòng cung cấp oldEmail và newEmail" });
      }

      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin") ? "Admin"
        : req.userRoles?.includes("Instructor") ? "Instructor" : null;

      const result = await classService.updateSingleEmail(parseInt(classId), oldEmail, newEmail, userId, userRole);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Update single email whitelist error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  /**
   * DELETE /api/classes/:classId/email-whitelist/single
   * Xóa 1 email khỏi whitelist + kick sinh viên ra khỏi lớp
   */
  async removeSingleEmailFromWhitelist(req, res) {
    try {
      const { classId } = req.params;
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({ success: false, message: "ID lớp học không hợp lệ" });
      }
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Vui lòng cung cấp email" });
      }

      const userId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin") ? "Admin"
        : req.userRoles?.includes("Instructor") ? "Instructor" : null;

      const result = await classService.removeSingleEmail(parseInt(classId), email, userId, userRole);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Remove single email whitelist error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
  }

  // ============================================================
  // RESUBMIT SETTING HANDLERS
  // ============================================================

  /**
   * POST /api/v1/classes/:classId/resubmit-setting
   * Instructor/Admin sets the maximum number of submissions allowed per presentation.
   */
  async setResubmitSetting(req, res) {
    try {
      const { classId } = req.params;
      const { maxSubmissions } = req.body;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      if (maxSubmissions === undefined || maxSubmissions === null) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp maxSubmissions (1-3)",
        });
      }

      const instructorId = req.user.userId;
      const userRole = req.userRoles?.includes("Admin")
        ? "Admin"
        : req.userRoles?.includes("Instructor")
          ? "Instructor"
          : null;

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: "Chỉ giảng viên hoặc admin mới có quyền thực hiện",
        });
      }

      const result = await classService.setResubmitSetting(
        parseInt(classId),
        maxSubmissions,
        instructorId,
        userRole,
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Set resubmit setting error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }

  /**
   * GET /api/v1/classes/:classId/resubmit-setting
   * Get the maximum submissions setting for a class.
   */
  async getResubmitSetting(req, res) {
    try {
      const { classId } = req.params;

      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ",
        });
      }

      const result = await classService.getResubmitSetting(parseInt(classId));
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Get resubmit setting error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
      });
    }
  }
}

module.exports = new ClassController();
