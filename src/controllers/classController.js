"use strict";

const { validationResult } = require("express-validator");
const classService = require("../services/classService");

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

      const classData = { ...req.body, courseId: parseInt(courseId) };
      const result = await classService.createClass(
        classData,
        req.user.userId,
        req.userRoles || []
      );

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
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
      const userRole = req.userRoles?.includes("Admin") ? "Admin" : "Student";

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
        ? "Admin"
        : req.userRoles?.includes("Instructor")
        ? "Instructor"
        : "Student";

      const result = await classService.getClassesByCourse(
        parseInt(courseId),
        userId,
        userRole
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
        ? "Admin"
        : req.userRoles?.includes("Instructor")
        ? "Instructor"
        : "Student";

      const result = await classService.updateClass(
        parseInt(classId),
        req.body,
        userId,
        userRole
      );

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

      const { instructorId, instructorIds } = req.body;
      const assignedBy = req.user.userId;

      // Handle single instructor
      if (instructorId) {
        const result = await classService.assignInstructor(
          parseInt(classId),
          parseInt(instructorId),
          assignedBy
        );

        if (result.success) {
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
            assignedBy
          );

          if (result.success) {
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
        parseInt(instructorId)
      );

      if (result.success) {
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
}

module.exports = new ClassController();
