"use strict";

const db = require("../models");
const {
  Enrollment,
  EnrollKey,
  Class,
  Course,
  User,
  ClassInstructor,
  Topic,
  TopicEnrollment,
} = db;

class EnrollmentService {
  /**
   * Join class using enrollment key (Student)
   */
  async joinClass(keyValue, studentId, classId) {
    const transaction = await db.sequelize.transaction();

    try {
      // Step 1: Validate key with row lock - must match both keyValue AND classId
      const key = await EnrollKey.findOne({
        where: {
          keyValue,
          classId, // Key must belong to the specified class
        },
        include: [{ model: Class, as: "class" }],
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!key) {
        await transaction.rollback();
        return {
          success: false,
          message: "Mã đăng ký không hợp lệ hoặc không thuộc lớp học này",
        };
      }

      // Step 2: Validate key status
      if (!key.isValid()) {
        await transaction.rollback();
        return {
          success: false,
          message:
            "Mã đăng ký đã hết hạn, bị vô hiệu hóa hoặc đã đạt giới hạn sử dụng",
        };
      }

      // Step 3: Check if already enrolled
      const existing = await Enrollment.findOne({
        where: { studentId, classId: key.classId },
        transaction,
      });

      if (existing) {
        await transaction.commit();
        return {
          success: true,
          message: "Bạn đã đăng ký lớp học này rồi",
          enrollment: existing,
          alreadyEnrolled: true,
        };
      }

      // Step 4: Check class capacity
      const classData = await Class.findByPk(key.classId, { transaction });
      if (classData.maxStudents) {
        const currentCount = await Enrollment.count({
          where: { classId: key.classId, status: "enrolled" },
          transaction,
        });

        if (currentCount >= classData.maxStudents) {
          await transaction.rollback();
          return { success: false, message: "Lớp học đã đầy" };
        }
      }

      // Step 5: Create enrollment
      const enrollment = await Enrollment.create(
        {
          studentId,
          classId: key.classId,
          enrolledAt: new Date(),
          status: "enrolled",
        },
        { transaction }
      );

      // Step 6: Increment key usage (atomic)
      await key.increment("usedCount", { transaction });

      await transaction.commit();

      return {
        success: true,
        message: "Đăng ký lớp học thành công",
        enrollment,
        alreadyEnrolled: false,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Join class error:", error);
      return {
        success: false,
        message: "Không thể đăng ký lớp học",
        error: error.message,
      };
    }
  }

  /**
   * Get student's enrolled classes WITH their enroll keys
   * Useful for students to see keys of classes they're enrolled in (to share with friends)
   */
  async getMyEnrollKeys(studentId) {
    try {
      const enrollments = await Enrollment.findAll({
        where: { studentId, status: "enrolled" },
        include: [
          {
            model: Class,
            as: "class",
            include: [
              { model: Course, as: "course" },
              {
                model: EnrollKey,
                as: "enrollKeys",
                where: { isActive: true },
                required: false,
              },
            ],
          },
        ],
        order: [[{ model: Class, as: "class" }, "classCode", "ASC"]],
      });

      const result = enrollments.map((e) => {
        const classData = e.toJSON();
        return {
          enrollmentId: e.enrollmentId,
          enrolledAt: e.enrolledAt,
          class: {
            classId: classData.class.classId,
            classCode: classData.class.classCode,
            classCode: classData.class.classCode,
            course: classData.class.course,
          },
          enrollKeys:
            classData.class.enrollKeys?.map((key) => ({
              keyId: key.keyId,
              keyValue: key.keyValue,
              expiresAt: key.expiresAt,
              maxUses: key.maxUses,
              usedCount: key.usedCount,
              remainingUses: key.maxUses ? key.maxUses - key.usedCount : null,
            })) || [],
        };
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("Get my enroll keys error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách mã đăng ký",
        error: error.message,
      };
    }
  }

  /**
   * Get student's enrolled classes
   */
  async getMyClasses(studentId) {
    try {
      const enrollments = await Enrollment.findAll({
        where: { studentId, status: "enrolled" },
        include: [
          {
            model: Class,
            as: "class",
            include: [
              { model: Course, as: "course" },
              {
                model: User,
                as: "instructors",
                through: { attributes: [] },
                attributes: ["userId", "username", "firstName", "lastName"],
              },
            ],
          },
        ],
        order: [[{ model: Class, as: "class" }, "classCode", "ASC"]],
      });

      return {
        success: true,
        data: enrollments.map((e) => e.toJSON()),
      };
    } catch (error) {
      console.error("Get my classes error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách lớp học",
        error: error.message,
      };
    }
  }

  /**
   * Leave class (Student)
   */
  async leaveClass(classId, studentId) {
    try {
      const enrollment = await Enrollment.findOne({
        where: { studentId, classId },
      });

      if (!enrollment) {
        return { success: false, message: "Bạn chưa đăng ký lớp học này" };
      }

      // Check if student has presentations
      const presentationCount = await db.Presentation.count({
        where: { studentId, classId },
      });

      if (presentationCount > 0) {
        // Soft delete (mark as dropped)
        await enrollment.update({ status: "dropped" });
        return {
          success: true,
          message: "Đã rời lớp học (dữ liệu bài thuyết trình được giữ lại)",
          softDelete: true,
        };
      } else {
        // Hard delete
        await enrollment.destroy();
        return {
          success: true,
          message: "Rời lớp học thành công",
          softDelete: false,
        };
      }
    } catch (error) {
      console.error("Leave class error:", error);
      return {
        success: false,
        message: "Không thể rời lớp học",
        error: error.message,
      };
    }
  }

  /**
   * Get class students (Instructor/Admin)
   */
  async getClassStudents(classId, userId, userRole) {
    try {
      // Authorization
      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });

        if (!isInstructor) {
          return {
            success: false,
            message: "Bạn không có quyền xem danh sách sinh viên",
          };
        }
      }

      const enrollments = await Enrollment.findAll({
        where: { classId, status: "enrolled" },
        include: [
          {
            model: User,
            as: "student",
            attributes: [
              "userId",
              "username",
              "firstName",
              "lastName",
              "email",
            ],
          },
        ],
        order: [[{ model: User, as: "student" }, "username", "ASC"]],
      });

      return {
        success: true,
        data: enrollments.map((e) => ({
          enrollmentId: e.enrollmentId,
          enrolledAt: e.enrolledAt,
          student: e.student,
        })),
      };
    } catch (error) {
      console.error("Get class students error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách sinh viên",
        error: error.message,
      };
    }
  }

  // ========== KEEP OLD TOPIC ENROLLMENT LOGIC ==========

  // ========== KEEP OLD TOPIC ENROLLMENT LOGIC ==========

  async enrollTopic(topicId, studentId) {
    try {
      const topic = await Topic.findByPk(topicId);
      if (!topic) {
        return { success: false, message: "Topic not found" };
      }

      // Check if student enrolled in any class of the course
      const classEnrollment = await Enrollment.findOne({
        include: [
          {
            model: Class,
            as: "class",
            where: { courseId: topic.courseId },
          },
        ],
        where: { studentId, status: "enrolled" },
      });

      if (!classEnrollment) {
        return {
          success: false,
          message: "You must enroll in a class before enrolling in a topic",
        };
      }

      const existing = await TopicEnrollment.findOne({
        where: { topicId, studentId },
      });

      if (existing) {
        if (existing.status === "enrolled") {
          return { success: false, message: "Already enrolled in this topic" };
        }

        await TopicEnrollment.update(
          { status: "enrolled", enrolledAt: new Date() },
          { where: { topicEnrollmentId: existing.topicEnrollmentId } }
        );

        return {
          success: true,
          message: "Re-enrolled in topic",
          topicEnrollmentId: existing.topicEnrollmentId,
        };
      }

      const topicEnrollment = await TopicEnrollment.create({
        topicId,
        studentId,
        status: "enrolled",
      });

      return {
        success: true,
        message: "Enrolled in topic",
        topicEnrollmentId: topicEnrollment.topicEnrollmentId,
      };
    } catch (error) {
      console.error("Enroll topic error:", error);
      return {
        success: false,
        message: "Failed to enroll in topic",
        error: error.message,
      };
    }
  }

  async dropTopic(topicId, studentId) {
    try {
      const existing = await TopicEnrollment.findOne({
        where: { topicId, studentId },
      });

      if (!existing || existing.status !== "enrolled") {
        return {
          success: false,
          message: "You are not enrolled in this topic",
        };
      }

      await TopicEnrollment.update(
        { status: "dropped" },
        { where: { topicEnrollmentId: existing.topicEnrollmentId } }
      );

      return { success: true, message: "Dropped topic successfully" };
    } catch (error) {
      console.error("Drop topic error:", error);
      return {
        success: false,
        message: "Failed to drop topic",
        error: error.message,
      };
    }
  }

  async listMyTopics(studentId) {
    try {
      const enrollments = await TopicEnrollment.findAll({
        where: { studentId, status: "enrolled" },
      });

      if (!enrollments.length) {
        return { success: true, topics: [] };
      }

      const topicIds = enrollments.map((e) => e.topicId);
      const topics = await Topic.findAll({
        where: { topicId: topicIds },
      });

      const courseIds = [...new Set(topics.map((t) => t.courseId))];
      const courses = await Course.findAll({
        where: { courseId: courseIds },
        include: [
          {
            model: User,
            as: "instructors",
            through: { attributes: [] },
            attributes: ["userId", "username", "firstName", "lastName"],
          },
        ],
      });

      const courseMap = new Map(courses.map((c) => [c.courseId, c]));
      const enrollmentMap = new Map(enrollments.map((e) => [e.topicId, e]));

      const result = topics.map((topic) => {
        const course = courseMap.get(topic.courseId);
        return {
          topicEnrollmentId: enrollmentMap.get(topic.topicId)
            ?.topicEnrollmentId,
          topicId: topic.topicId,
          topicName: topic.topicName,
          description: topic.description,
          sequenceNumber: topic.sequenceNumber,
          dueDate: topic.dueDate,
          maxDurationMinutes: topic.maxDurationMinutes,
          enrolledAt: enrollmentMap.get(topic.topicId)?.enrolledAt,
          course: course
            ? {
                courseId: course.courseId,
                courseCode: course.courseCode,
                courseName: course.courseName,
                instructors: course.instructors || [],
              }
            : null,
        };
      });

      return { success: true, topics: result };
    } catch (error) {
      console.error("List my topics error:", error);
      return {
        success: false,
        message: "Failed to retrieve topics",
        error: error.message,
      };
    }
  }
}

module.exports = new EnrollmentService();
