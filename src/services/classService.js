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

class ClassService {
  /**
   * Create new class with enrollment key (Admin or Lead Instructor)
   * Authorization: Admin OR instructor in course with 'lead' role
   */
  async createClass(classData, userId) {
    const { courseId, classCode, startDate, endDate, maxStudents, maxGroupMembers, enrollKey, keyExpiresAt, keyMaxUses } = classData;
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

      // Create enrollment key for the new class
      const enrollmentKey = await EnrollKey.create({
        classId: newClass.classId,
        keyValue: enrollKey,
        expiresAt: keyExpiresAt ? new Date(keyExpiresAt) : null,
        maxUses: keyMaxUses || null,
        usedCount: 0,
        isActive: true,
        createdBy: userId,
      }, { transaction });

      // Auto-assign creator as instructor to the class
      await ClassInstructor.create({
        classId: newClass.classId,
        instructorId: userId,
        assignedBy: userId
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        message: "Tạo lớp học và mã đăng ký thành công",
        class: newClass,
        enrollmentKey: {
          keyId: enrollmentKey.keyId,
          keyValue: enrollmentKey.keyValue,
          expiresAt: enrollmentKey.expiresAt,
          maxUses: enrollmentKey.maxUses,
          isActive: enrollmentKey.isActive
        }
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
   * Get classes by course (Admin or Instructor in course)
   */
  async getClassesByCourse(courseId, userId, userRole) {
    try {
      const where = { courseId };

      // If Instructor (not admin or student), filter by instructor assignment
      if (userRole === "Instructor") {
        const instructorClassIds = await ClassInstructor.findAll({
          where: { instructorId: userId },
          attributes: ["classId"],
        }).then((records) => records.map((r) => r.classId));

        if (instructorClassIds.length === 0) {
          return { success: true, data: [] };
        }

        where.classId = { [Op.in]: instructorClassIds };
      }
      // Admin and Student can see all classes in course

      const classes = await Class.findAll({
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
            attributes: ["keyId", "isActive", "expiresAt"],
          },
        ],
        order: [["classCode", "ASC"]],
      });

      return {
        success: true,
        data: classes.map((c) => ({
          ...c.toJSON(),
          enrollmentCount: c.enrollments?.length || 0,
          activeKeyCount: c.enrollKeys?.filter((k) => k.isActive).length || 0,
        })),
      };
    } catch (error) {
      console.error("Get classes error:", error);
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
            attributes: ["keyId", "isActive"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        distinct: true,
      });

      return {
        success: true,
        data: classes.map((c) => ({
          ...c.toJSON(),
          enrollmentCount: c.enrollments?.length || 0,
          activeKeyCount: c.enrollKeys?.filter((k) => k.isActive).length || 0,
        })),
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
            include: [
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
                ],
              },
            ],
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
          // Instructor must be assigned to the class
          const isInstructor = await ClassInstructor.findOne({
            where: { classId, instructorId: userId },
          });

          if (!isInstructor) {
            return {
              success: false,
              message: "Bạn không có quyền truy cập lớp học này",
            };
          }
        } else if (userRole === "Student") {
          // Student must be enrolled in the class
          const isEnrolled = await Enrollment.findOne({
            where: { classId, studentId: userId, status: "enrolled" },
          });

          if (!isEnrolled) {
            return {
              success: false,
              message: "Bạn không có quyền truy cập lớp học này",
            };
          }
        }
      }

      // Prepare response - hide enrollment keys from students
      const response = classData.toJSON();
      if (userRole === "Student") {
        delete response.enrollKeys;
      }

      // Add derived fields
      const totalStudents = response.enrollments?.length || 0;
      const topics = response.course?.topics || [];

      return {
        success: true,
        class: {
          ...response,
          totalStudents,
          topics,
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
      const { enrollKey, keyExpiresAt, keyMaxUses, ...classUpdates } = updates;

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
        }
        // If no active key exists, just skip enrollment key update
        // Class info update still succeeds
      }

      await transaction.commit();

      // Fetch updated class with key info
      const updatedClass = await Class.findByPk(classId, {
        include: [
          {
            model: EnrollKey,
            as: 'enrollKeys',
            where: { isActive: true, isRevoked: false },
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
  async removeInstructor(classId, instructorId) {
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
}

module.exports = new ClassService();
