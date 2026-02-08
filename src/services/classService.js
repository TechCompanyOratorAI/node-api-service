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
} = db;
const { Op } = require("sequelize");

class ClassService {
  /**
   * Create new class (Admin or Lead Instructor)
   * Authorization: Admin OR instructor in course with 'lead' role
   */
  async createClass(classData, userId) {
    const { courseId, classCode, startDate, endDate, maxStudents } = classData;

    try {
      // Check course exists
      const course = await Course.findByPk(courseId);
      if (!course) {
        return { success: false, message: "Không tìm thấy khóa học" };
      }

      // Check class code unique within course
      const existing = await Class.findOne({
        where: { courseId, classCode },
      });
      if (existing) {
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
        createdBy: userId,
      });

      return {
        success: true,
        message: "Tạo lớp học thành công",
        class: newClass,
      };
    } catch (error) {
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
          { model: Course, as: "course" },
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
        ],
      });

      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization check for non-admin
      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });

        if (!isInstructor) {
          return {
            success: false,
            message: "Bạn không có quyền truy cập lớp học này",
          };
        }
      }

      return { success: true, class: classData };
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
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization
      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });
        if (!isInstructor) {
          return {
            success: false,
            message: "Bạn không có quyền chỉnh sửa lớp học này",
          };
        }
      }

      // Update
      await classData.update(updates);

      return {
        success: true,
        message: "Cập nhật lớp học thành công",
        class: classData,
      };
    } catch (error) {
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
