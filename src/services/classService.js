"use strict";

const db = require("../models");
const {
  Class,
  ClassInstructor,
  Course,
  CourseInstructor,
  User,
  Enrollment,
  Presentation,
  EnrollKey,
  Topic,
} = db;
const { Op } = require("sequelize");
const { emitUploadPermissionChanged } = require("../websocket/emitters");
const auditLogService = require("./auditLogService");
const { AUDIT_ACTIONS, AUDIT_STATUSES } = require("../constants/businessConstants");

class ClassService {
  /**
   * Create new class (Admin only)
   */
  async createClass(classData, userId, userRoles = []) {
    const { courseId, classCode, startDate, endDate, maxStudents, maxGroupMembers } = classData;
    const transaction = await db.sequelize.transaction();

    try {
      // Check course exists
      const course = await Course.findByPk(courseId, { transaction });
      if (!course) {
        await transaction.rollback();
        return { success: false, message: "Không tìm thấy khóa học" };
      }

      // Check class code unique within course
      const existing = await Class.findOne({
        where: { courseId, classCode },
        transaction
      });
      if (existing) {
        await transaction.rollback();
        return {
          success: false,
          message: "Mã lớp đã tồn tại trong khóa học này",
        };
      }

      // Create class
      const newClass = await Class.create({
        courseId,
        classCode,
        status: "active",
        startDate,
        endDate,
        maxStudents,
        maxGroupMembers,
        createdBy: userId,
      }, { transaction });

      const isAdmin = userRoles.includes("Admin");
      const isInstructor = userRoles.includes("Instructor");

      // Only instructor creators should be auto-assigned to the class.
      if (isInstructor && !isAdmin) {
        await ClassInstructor.create({
          classId: newClass.classId,
          instructorId: userId,
          assignedBy: userId
        }, { transaction });
      }

      await transaction.commit();

      return {
        success: true,
        message: "Tạo lớp học thành công",
        class: newClass,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Create class error:", error);
      return {
        success: false,
        message: "Không thể tạo lớp học",
        error: error.message,
      };
    }
  }

  /**
   * Get classes by course (Admin or Instructor in course) with pagination
   */
  async getClassesByCourse(courseId, userId, userRole, pagination = {}) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;

      const where = { courseId };

      // Student chỉ thấy lớp active và chưa hết hạn
      if (userRole === "Student") {
        where.status = "active";
        where.endDate = { [Op.gte]: new Date() };
      }

      // If Instructor (not admin or student), filter by instructor assignment
      if (userRole === "Instructor") {
        const instructorClassIds = await ClassInstructor.findAll({
          where: { instructorId: userId },
          attributes: ["classId"],
        }).then((records) => records.map((r) => r.classId));

        if (instructorClassIds.length === 0) {
          return { success: true, data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        }

        where.classId = { [Op.in]: instructorClassIds };
      }
      // Admin can see all classes in course

      const { count, rows: classes } = await Class.findAndCountAll({
        where,
        include: [
          {
            model: Course,
            as: "course",
            attributes: ["courseId", "courseCode", "courseName"],
          },
          {
            model: User,
            as: "instructors",
            through: { attributes: [] },
            attributes: ["userId", "username", "firstName", "lastName"],
          },
          {
            model: Enrollment,
            as: "enrollments",
            attributes: ["enrollmentId"],
          },
          {
            model: EnrollKey,
            as: "enrollKeys",
            attributes: ["keyId", "keyValue", "isActive", "expiresAt"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["classCode", "ASC"]],
        distinct: true,
      });

     return {
  success: true,
  data: classes.map((c) => {
    const classData = {
      ...c.toJSON(),
      enrollmentCount: c.enrollments?.length || 0,
      activeKeyCount: c.enrollKeys?.filter((k) => k.isActive).length || 0,
    };

    // Admin / Instructor mới thấy enroll key
    if (userRole === "Admin" || userRole === "Instructor") {
      const activeKey = c.enrollKeys?.find((k) => k.isActive);
      classData.enrollkey = activeKey?.keyValue || null;
    }

    return classData;
  }),

  pagination: {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count / limit),
  },
};
    } catch (error) {
      console.error("Get classes by course error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách lớp học",
        error: error.message,
      };
    }
  }


  /**
   * Get all classes (Admin and Student) with pagination and filters
   */
  async getAllClasses({
    page = 1,
    limit = 20,
    search,
    courseId,
    userId,
    userRole,
  }) {
    try {
      const where = {};

      // Filter by courseId if provided
      if (courseId) {
        where.courseId = courseId;
      }

      // Search by classCode
      if (search) {
        where.classCode = { [Op.like]: `%${search}%` };
      }

      const offset = (page - 1) * limit;

      const { count, rows: classes } = await Class.findAndCountAll({
        where,
        include: [
          {
            model: Course,
            as: "course",
            attributes: ["courseId", "courseCode", "courseName"],
          },
          {
            model: User,
            as: "instructors",
            through: { attributes: [] },
            attributes: ["userId", "username", "firstName", "lastName"],
          },
          {
            model: Enrollment,
            as: "enrollments",
            attributes: ["enrollmentId"],
          },
          {
            model: EnrollKey,
            as: "enrollKeys",
            attributes: ["keyId", "keyValue", "isActive", "expiresAt"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        distinct: true,
      });

      return {
        success: true,
        data: classes.map((c) => {
          const classData = {
            ...c.toJSON(),
            enrollmentCount: c.enrollments?.length || 0,
            activeKeyCount: c.enrollKeys?.filter((k) => k.isActive).length || 0,
          };

          // Include enrollkey for Admin or Instructor
          if (userRole === "Admin" || userRole === "Instructor") {
            const activeKey = c.enrollKeys?.find((k) => k.isActive);
            classData.enrollkey = activeKey?.keyValue || null;
          }

          return classData;
        }),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error("Get all classes error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách lớp học",
        error: error.message,
      };
    }
  }

  /**

     * Get classes assigned to instructor
     */
  async getMyTeachingClasses(instructorId) {
    try {
      // Get all classIds assigned to this instructor
      const assignments = await ClassInstructor.findAll({
        where: { instructorId },
        attributes: ["classId"],
      });

      if (assignments.length === 0) {
        return {
          success: true,
          data: [],
          message: "Bạn chưa được phân công vào lớp nào",
        };
      }

      const classIds = assignments.map((a) => a.classId);

      // Get full class details
      const classes = await Class.findAll({
        where: { classId: { [Op.in]: classIds } },
        include: [
          {
            model: Course,
            as: "course",
            attributes: [
              "courseId",
              "courseCode",
              "courseName",
              "semester",
              "academicYear",
            ],
          },
          {
            model: User,
            as: "instructors",
            through: { attributes: [] },
            attributes: ["userId", "username", "firstName", "lastName"],
          },
          {
            model: Enrollment,
            as: "enrollments",
            attributes: ["enrollmentId", "studentId", "status"],
            where: { status: "enrolled" },
            required: false,
          },
          {
            model: EnrollKey,
            as: "enrollKeys",
            attributes: [
              "keyId",
              "keyValue",
              "isActive",
              "expiresAt",
              "maxUses",
              "usedCount",
            ],
            where: { isActive: true, isRevoked: false },
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        data: classes.map((c) => ({
          classId: c.classId,
          classCode: c.classCode,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          maxStudents: c.maxStudents,
          maxGroupMembers: c.maxGroupMembers,
          course: c.course,
          instructors: c.instructors,
          enrollmentCount: c.enrollments?.length || 0,
          activeKeys: c.enrollKeys || [],
          createdAt: c.createdAt,
        })),
      };
    } catch (error) {
      console.error("Get my teaching classes error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách lớp giảng dạy",
        error: error.message,
      };
    }
  }

  /**
   * Get class by ID
   */
  async getClassById(classId, userId, userRole) {
    try {
      const classData = await Class.findByPk(classId, {
        include: [
          {
            model: Course,
            as: "course",
            attributes: ["courseId", "courseCode", "courseName", "semester", "academicYear"],
          },
          {
            model: Topic,
            as: "topics",
            attributes: [
              "topicId",
              "topicName",
              "description",
              "sequenceNumber",
              "dueDate",
              "maxDurationMinutes",
              "requirements",
            ],
            required: false,
            order: [["sequenceNumber", "ASC"]],
          },
          {
            model: User,
            as: "instructors",
            through: { attributes: [] },
            attributes: [
              "userId",
              "username",
              "firstName",
              "lastName",
              "email",
            ],
          },
          {
            model: Enrollment,
            as: "enrollments",
            attributes: [
              "enrollmentId",
              "studentId",
              "classId",
              "enrolledAt",
              "status",
              "finalGrade",
              "createdAt",
              "updatedAt",
            ],
            include: [
              {
                model: User,
                as: "student",
                attributes: ["userId", "username", "firstName", "lastName"],
              },
            ],
          },
          {
            model: EnrollKey,
            as: "enrollKeys",
            attributes: [
              "keyId",
              "keyValue",
              "expiresAt",
              "maxUses",
              "usedCount",
              "isActive",
              "isRevoked",
              "createdAt",
            ],
            required: false,
          },
        ],
      });

      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization check for non-admin
      if (userRole !== "Admin") {
        if (userRole === "Instructor") {
          const isInstructor = await ClassInstructor.findOne({
            where: { classId, instructorId: userId },
          });
          if (!isInstructor) {
            return { success: false, message: "Bạn không có quyền truy cập lớp học này" };
          }
        } else if (userRole === "Student") {
          const isEnrolled = await Enrollment.findOne({
            where: { classId, studentId: userId, status: "enrolled" },
          });
          if (!isEnrolled) {
            return { success: false, message: "Bạn không có quyền truy cập lớp học này" };
          }
        }
      }

      const response = classData.toJSON();
      if (userRole === "Student") {
        delete response.enrollKeys;
      }

      return {
        success: true,
        class: {
          ...response,
          totalStudents: response.enrollments?.length || 0,
          // topics is now directly on the class
        },
      };
    } catch (error) {
      console.error("Get class error:", error);
      return {
        success: false,
        message: "Không thể lấy thông tin lớp học",
        error: error.message,
      };
    }
  }

  /**
   * Update class (Admin or assigned instructor)
   */
  async updateClass(classId, updates, userId, userRole) {
    const transaction = await db.sequelize.transaction();

    try {
      const classData = await Class.findByPk(classId, { transaction });
      if (!classData) {
        await transaction.rollback();
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization
      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
          transaction
        });
        if (!isInstructor) {
          await transaction.rollback();
          return {
            success: false,
            message: "Bạn không có quyền chỉnh sửa lớp học này",
          };
        }
      }

      // Extract enrollment key fields from updates
      const { enrollKey, keyExpiresAt, keyMaxUses, ...rawClassUpdates } = updates;
      let classUpdates = rawClassUpdates;

      if (userRole === "Instructor") {
        classUpdates = {};
        if (rawClassUpdates.maxGroupMembers !== undefined) {
          classUpdates.maxGroupMembers = rawClassUpdates.maxGroupMembers;
        }
      }

      // Update class info
      await classData.update(classUpdates, { transaction });

      // Update enrollment key if provided
      if (enrollKey !== undefined || keyExpiresAt !== undefined || keyMaxUses !== undefined) {
        // Find active enrollment key for this class
        const activeKey = await EnrollKey.findOne({
          where: {
            classId,
            isActive: true,
            isRevoked: false
          },
          order: [['createdAt', 'DESC']],
          transaction
        });

        if (activeKey) {
          // Update existing key
          const keyUpdates = {};
          if (enrollKey !== undefined) keyUpdates.keyValue = enrollKey;
          if (keyExpiresAt !== undefined) keyUpdates.expiresAt = keyExpiresAt ? new Date(keyExpiresAt) : null;
          if (keyMaxUses !== undefined) keyUpdates.maxUses = keyMaxUses;

          await activeKey.update(keyUpdates, { transaction });
        } else if (enrollKey !== undefined) {
          // No active key exists → create a new one
          await EnrollKey.create({
            classId,
            keyValue: enrollKey,
            expiresAt: keyExpiresAt ? new Date(keyExpiresAt) : null,
            maxUses: keyMaxUses || null,
            usedCount: 0,
            isActive: true,
            isRevoked: false,
            createdBy: userId,
          }, { transaction });
        }
      }

      await transaction.commit();

      // Fetch updated class with full key info
      const updatedClass = await Class.findByPk(classId, {
        include: [
          {
            model: EnrollKey,
            as: 'enrollKeys',
            attributes: ['keyId', 'keyValue', 'expiresAt', 'maxUses', 'usedCount', 'isActive', 'isRevoked', 'createdAt'],
            required: false
          }
        ]
      });

      return {
        success: true,
        message: "Cập nhật lớp học thành công",
        class: updatedClass,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Update class error:", error);
      return {
        success: false,
        message: "Không thể cập nhật lớp học",
        error: error.message,
      };
    }
  }

  /**
   * Delete class (Admin only, or soft-delete if has enrollments)
   */
  async deleteClass(classId, userId) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Check enrollments
      const enrollmentCount = await Enrollment.count({ where: { classId } });

      if (enrollmentCount > 0) {
        // Soft delete (archive)
        await classData.update({ status: "archived" });
        return {
          success: true,
          message: "Lớp học đã được lưu trữ (có sinh viên đã đăng ký)",
          archived: true,
        };
      } else {
        // Hard delete
        await classData.destroy();
        return {
          success: true,
          message: "Xóa lớp học thành công",
          archived: false,
        };
      }
    } catch (error) {
      console.error("Delete class error:", error);
      return {
        success: false,
        message: "Không thể xóa lớp học",
        error: error.message,
      };
    }
  }

  /**
   * Assign instructor to class
   */
  async assignInstructor(classId, instructorId, assignedBy) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Check instructor in course
      const inCourse = await CourseInstructor.findOne({
        where: { courseId: classData.courseId, instructorId },
      });

      if (!inCourse) {
        return {
          success: false,
          message: "Giảng viên phải được phân công vào khóa học trước",
        };
      }

      // Check not already assigned
      const existing = await ClassInstructor.findOne({
        where: { classId, instructorId },
      });

      if (existing) {
        return {
          success: false,
          message: "Giảng viên đã được phân công vào lớp học này",
        };
      }

      // Assign
      await ClassInstructor.create({
        classId,
        instructorId,
        assignedBy,
      });

      await auditLogService.log({
        actorUserId: assignedBy,
        action: AUDIT_ACTIONS.CLASS_INSTRUCTOR_ASSIGNED,
        entityType: "ClassInstructor",
        entityId: classId,
        status: AUDIT_STATUSES.SUCCESS,
        metadata: { classId, instructorId },
      });

      return { success: true, message: "Phân công giảng viên thành công" };
    } catch (error) {
      console.error("Assign instructor error:", error);
      return {
        success: false,
        message: "Không thể phân công giảng viên",
        error: error.message,
      };
    }
  }

  /**
   * Remove instructor from class
   */
  async removeInstructor(classId, instructorId, removedBy = null) {
    try {
      const assignment = await ClassInstructor.findOne({
        where: { classId, instructorId },
      });

      if (!assignment) {
        return {
          success: false,
          message: "Giảng viên chưa được phân công vào lớp học này",
        };
      }

      await assignment.destroy();

      await auditLogService.log({
        actorUserId: removedBy,
        action: AUDIT_ACTIONS.CLASS_INSTRUCTOR_REMOVED,
        entityType: "ClassInstructor",
        entityId: classId,
        status: AUDIT_STATUSES.SUCCESS,
        metadata: { classId, instructorId },
      });

      return { success: true, message: "Gỡ bỏ giảng viên thành công" };
    } catch (error) {
      console.error("Remove instructor error:", error);
      return {
        success: false,
        message: "Không thể gỡ bỏ giảng viên",
        error: error.message,
      };
    }
  }

  // ============================================================
  // TOPIC MANAGEMENT (per-class)
  // ============================================================

  /**
   * Create a topic for a specific class (Instructor/Admin only)
   */
  async createTopic(classId, topicData, userId, userRole) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization: must be instructor of this class or Admin
      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });
        if (!isInstructor) {
          return { success: false, message: "Bạn không có quyền tạo topic cho lớp này" };
        }
      }

      const { topicName, description, sequenceNumber, dueDate, maxDurationMinutes, requirements } = topicData;

      // Auto sequence if not provided
      const nextSeq = sequenceNumber ||
        ((await Topic.max("sequenceNumber", { where: { classId } })) || 0) + 1;

      // Check duplicate sequence
      if (sequenceNumber) {
        const existing = await Topic.findOne({ where: { classId, sequenceNumber } });
        if (existing) {
          return { success: false, message: "Số thứ tự đã tồn tại trong lớp này" };
        }
      }

      const topic = await Topic.create({
        classId,
        courseId: classData.courseId, // keep for reference
        topicName,
        description,
        sequenceNumber: nextSeq,
        dueDate,
        maxDurationMinutes,
        requirements,
      });

      return { success: true, message: "Tạo topic thành công", topic };
    } catch (error) {
      console.error("Create topic error:", error);
      return { success: false, message: "Không thể tạo topic", error: error.message };
    }
  }

  /**
   * Get all topics of a class
   */
  async getTopicsByClass(classId, userId, userRole) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      const topics = await Topic.findAll({
        where: { classId },
        order: [["sequenceNumber", "ASC"]],
      });

      return { success: true, topics };
    } catch (error) {
      console.error("Get topics by class error:", error);
      return { success: false, message: "Không thể lấy danh sách topic", error: error.message };
    }
  }

  /**
   * Update a topic (Instructor of class or Admin)
   */
  async updateTopic(topicId, topicData, userId, userRole) {
    try {
      const topic = await Topic.findByPk(topicId);
      if (!topic) {
        return { success: false, message: "Không tìm thấy topic" };
      }

      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId: topic.classId, instructorId: userId },
        });
        if (!isInstructor) {
          return { success: false, message: "Bạn không có quyền sửa topic này" };
        }
      }

      const { topicName, description, sequenceNumber, dueDate, maxDurationMinutes, requirements } = topicData;

      if (sequenceNumber && sequenceNumber !== topic.sequenceNumber) {
        const existing = await Topic.findOne({
          where: { classId: topic.classId, sequenceNumber, topicId: { [Op.ne]: topicId } },
        });
        if (existing) {
          return { success: false, message: "Số thứ tự đã tồn tại trong lớp này" };
        }
      }

      await topic.update({
        topicName: topicName || topic.topicName,
        description: description !== undefined ? description : topic.description,
        sequenceNumber: sequenceNumber || topic.sequenceNumber,
        dueDate: dueDate !== undefined ? dueDate : topic.dueDate,
        maxDurationMinutes: maxDurationMinutes !== undefined ? maxDurationMinutes : topic.maxDurationMinutes,
        requirements: requirements !== undefined ? requirements : topic.requirements,
      });

      return { success: true, message: "Cập nhật topic thành công", topic };
    } catch (error) {
      console.error("Update topic error:", error);
      return { success: false, message: "Không thể cập nhật topic", error: error.message };
    }
  }

  /**
   * Delete a topic (Instructor of class or Admin)
   */
  async deleteTopic(topicId, userId, userRole) {
    try {
      const topic = await Topic.findByPk(topicId);
      if (!topic) {
        return { success: false, message: "Không tìm thấy topic" };
      }

      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId: topic.classId, instructorId: userId },
        });
        if (!isInstructor) {
          return { success: false, message: "Bạn không có quyền xóa topic này" };
        }
      }

      const { Presentation } = db;
      const hasPresentation = await Presentation.count({ where: { topicId } });
      if (hasPresentation > 0) {
        return { success: false, message: "Không thể xóa topic đã có bài thuyết trình" };
      }

      await topic.destroy();
      return { success: true, message: "Xóa topic thành công" };
    } catch (error) {
      console.error("Delete topic error:", error);
      return { success: false, message: "Không thể xóa topic", error: error.message };
    }
  }

  // ============================================================
  // UPLOAD PERMISSION METHODS
  // ============================================================

  /**
   * Set upload permission for a class
   */
  async setUploadPermission(classId, data, instructorId, userRole) {
    try {
      const { Class, ClassInstructor } = require("../models");

      // Find the class
      const classRecord = await Class.findByPk(classId);
      if (!classRecord) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Check permission: Admin hoặc Instructor phụ trách lớp này
      let hasPermission = false;

      if (userRole === "Admin") {
        hasPermission = true;
      } else if (userRole === "Instructor") {
        // Kiểm tra instructor có phụ trách lớp này không qua bảng ClassInstructor
        const classInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId },
        });
        hasPermission = !!classInstructor;
      }

      if (!hasPermission) {
        return {
          success: false,
          message: "Bạn không có quyền thay đổi cài đặt của lớp học này",
        };
      }

      // Update class
      await classRecord.update({
        isUploadEnabled: data.isUploadEnabled,
        uploadStartDate: data.uploadStartDate || null,
        uploadEndDate: data.uploadEndDate || null,
      });

      emitUploadPermissionChanged(classId, {
        isUploadEnabled: classRecord.isUploadEnabled,
        uploadStartDate: classRecord.uploadStartDate,
        uploadEndDate: classRecord.uploadEndDate,
      });

      return {
        success: true,
        message: data.isUploadEnabled
          ? "Đã mở cho phép upload bài thuyết trình"
          : "Đã đóng không cho phép upload bài thuyết trình",
        data: {
          classId,
          isUploadEnabled: classRecord.isUploadEnabled,
          uploadStartDate: classRecord.uploadStartDate,
          uploadEndDate: classRecord.uploadEndDate,
        },
      };
    } catch (error) {
      console.error("Set upload permission error:", error);
      return {
        success: false,
        message: "Không thể cập nhật cài đặt upload",
        error: error.message,
      };
    }
  }

  /**
   * Get upload permission for a class
   */
  async getUploadPermission(classId) {
    try {
      const { Class } = require("../models");

      const classRecord = await Class.findByPk(classId, {
        attributes: ["classId", "isUploadEnabled", "uploadStartDate", "uploadEndDate"],
      });

      if (!classRecord) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      return {
        success: true,
        data: {
          classId: classRecord.classId,
          isUploadEnabled: classRecord.isUploadEnabled,
          uploadStartDate: classRecord.uploadStartDate,
          uploadEndDate: classRecord.uploadEndDate,
        },
      };
    } catch (error) {
      console.error("Get upload permission error:", error);
      return {
        success: false,
        message: "Không thể lấy cài đặt upload",
        error: error.message,
      };
    }
  }

  // ============================================================
  // EMAIL WHITELIST MANAGEMENT
  // ============================================================

  /**
   * Replace email whitelist for a class (Admin/Instructor only)
   */
  async setEmailWhitelist(classId, emails, userId, userRole) {
    const transaction = await db.sequelize.transaction();
    try {
      const classData = await Class.findByPk(classId, { transaction });
      if (!classData) {
        await transaction.rollback();
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization
      if (userRole !== "Admin") {
        if (userRole !== "Instructor") {
          await transaction.rollback();
          return { success: false, message: "Bạn không có quyền thực hiện" };
        }
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
          transaction,
        });
        if (!isInstructor) {
          await transaction.rollback();
          return { success: false, message: "Bạn không có quyền thực hiện" };
        }
      }

      const { ClassEmailWhitelist } = db;

      // Replace: xóa cũ rồi insert mới
      await ClassEmailWhitelist.destroy({ where: { classId }, transaction });

      const records = emails.map((email) => ({ classId, email }));
      await ClassEmailWhitelist.bulkCreate(records, {
        ignoreDuplicates: true,
        transaction,
      });

      await transaction.commit();

      return {
        success: true,
        message: `Đã cập nhật danh sách ${emails.length} email sinh viên cho lớp học`,
        total: emails.length,
        emails,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Set email whitelist error:", error);
      return {
        success: false,
        message: "Không thể cập nhật danh sách email",
        error: error.message,
      };
    }
  }

  /**
   * Get email whitelist for a class
   */
  async getEmailWhitelist(classId) {
    try {
      const { ClassEmailWhitelist } = db;
      const records = await ClassEmailWhitelist.findAll({
        where: { classId },
        attributes: ["id", "email", "createdAt"],
        order: [["email", "ASC"]],
      });

      return {
        success: true,
        classId,
        total: records.length,
        hasWhitelist: records.length > 0,
        emails: records.map((r) => r.email),
      };
    } catch (error) {
      console.error("Get email whitelist error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách email",
        error: error.message,
      };
    }
  }

  /**
   * Delete all whitelist entries for a class (Admin/Instructor only)
   */
  async deleteEmailWhitelist(classId, userId, userRole) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization
      if (userRole !== "Admin") {
        if (userRole !== "Instructor") {
          return { success: false, message: "Bạn không có quyền thực hiện" };
        }
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });
        if (!isInstructor) {
          return { success: false, message: "Bạn không có quyền thực hiện" };
        }
      }

      const { ClassEmailWhitelist } = db;
      const deleted = await ClassEmailWhitelist.destroy({ where: { classId } });

      return {
        success: true,
        message: `Đã xóa danh sách email whitelist (${deleted} email). Lớp học sẽ cho phép tất cả sinh viên tham gia.`,
        deleted,
      };
    } catch (error) {
      console.error("Delete email whitelist error:", error);
      return {
        success: false,
        message: "Không thể xóa danh sách email",
        error: error.message,
      };
    }
  }
}

module.exports = new ClassService();
