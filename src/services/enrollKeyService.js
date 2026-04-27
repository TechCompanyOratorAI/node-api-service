"use strict";

const db = require("../models");
const crypto = require("crypto");
const { EnrollKey, Class, ClassInstructor, CourseInstructor, Enrollment, Course, User } = db;

class EnrollKeyService {
  /**
   * Generate enrollment key in format: ORA-XXXX-XXXX-XXXX
   * Uses 12 hex chars (6 random bytes) → ~281 trillion unique combinations
   */
  generateKey() {
    const hex = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `ORA-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  }

  /**
   * Create enrollment key for class
   * Authorization: Admin OR instructor assigned to both course AND class
   * Key is globally unique across ALL classes
   */
  async createKey(classId, keyData, userId, userRole) {
    const { expiresAt, maxUses } = keyData;

    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // Authorization check for non-admin
      if (userRole !== "Admin") {
        // Check instructor in course
        const inCourse = await CourseInstructor.findOne({
          where: { courseId: classData.courseId, instructorId: userId },
        });

        if (!inCourse) {
          return {
            success: false,
            message: "Bạn chưa được phân công vào khóa học này",
          };
        }

        // Check instructor in class
        const inClass = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });

        if (!inClass) {
          return {
            success: false,
            message: "Bạn chưa được phân công vào lớp học này",
          };
        }
      }

      // Check if class already has an active key
      const activeKey = await EnrollKey.findOne({
        where: {
          classId,
          isActive: true,
          isRevoked: false,
        },
      });

      if (activeKey) {
        // Check if key is still valid (not expired and not reached max uses)
        const now = new Date();
        const isExpired =
          activeKey.expiresAt && new Date(activeKey.expiresAt) <= now;
        const isMaxUsesReached =
          activeKey.maxUses && activeKey.usedCount >= activeKey.maxUses;

        if (!isExpired && !isMaxUsesReached) {
          return {
            success: false,
            message:
              "Lớp học đã có mã đăng ký đang hoạt động. Vui lòng thu hồi hoặc đợi mã cũ hết hạn",
            existingKey: {
              keyId: activeKey.keyId,
              keyValue: activeKey.keyValue,
              expiresAt: activeKey.expiresAt,
              maxUses: activeKey.maxUses,
              usedCount: activeKey.usedCount,
            },
          };
        }
      }

      // Generate unique key — globally unique across ALL classes
      let keyValue;
      let attempts = 0;
      do {
        keyValue = this.generateKey();
        const existing = await EnrollKey.findOne({ where: { keyValue } });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return { success: false, message: "Không thể tạo mã đăng ký duy nhất. Vui lòng thử lại." };
      }

      // Create key
      const newKey = await EnrollKey.create({
        classId,
        keyValue,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
        usedCount: 0,
        isActive: true,
        createdBy: userId,
      });

      return {
        success: true,
        message: "Tạo mã đăng ký thành công",
        key: newKey,
      };
    } catch (error) {
      console.error("Create key error:", error);
      return {
        success: false,
        message: "Không thể tạo mã đăng ký",
        error: error.message,
      };
    }
  }

  /**
   * Rotate key (deactivate old, create new)
   */
  async rotateKey(keyId, userId, userRole) {
    try {
      const oldKey = await EnrollKey.findByPk(keyId, {
        include: [{ model: Class, as: "class" }],
      });

      if (!oldKey) {
        return { success: false, message: "Không tìm thấy mã đăng ký" };
      }

      // Authorization
      if (userRole !== "Admin") {
        const inClass = await ClassInstructor.findOne({
          where: { classId: oldKey.classId, instructorId: userId },
        });

        if (!inClass) {
          return { success: false, message: "Bạn không có quyền" };
        }
      }

      // Deactivate old key
      await oldKey.update({ isActive: false });

      // Generate new globally unique key
      let newKeyValue;
      let attempts = 0;
      do {
        newKeyValue = this.generateKey();
        const existing = await EnrollKey.findOne({ where: { keyValue: newKeyValue } });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      const newKey = await EnrollKey.create({
        classId: oldKey.classId,
        keyValue: newKeyValue,
        expiresAt: oldKey.expiresAt,
        maxUses: oldKey.maxUses,
        usedCount: 0,
        isActive: true,
        createdBy: userId,
      });

      return {
        success: true,
        message: "Thay đổi mã đăng ký thành công",
        oldKey: {
          keyId: oldKey.keyId,
          keyValue: oldKey.keyValue,
          isActive: false,
        },
        newKey,
      };
    } catch (error) {
      console.error("Rotate key error:", error);
      return {
        success: false,
        message: "Không thể thay đổi mã đăng ký",
        error: error.message,
      };
    }
  }

  /**
   * Revoke key
   */
  async revokeKey(keyId, userId, userRole) {
    try {
      const key = await EnrollKey.findByPk(keyId);
      if (!key) {
        return { success: false, message: "Không tìm thấy mã đăng ký" };
      }

      // Authorization
      if (userRole !== "Admin") {
        const inClass = await ClassInstructor.findOne({
          where: { classId: key.classId, instructorId: userId },
        });

        if (!inClass) {
          return { success: false, message: "Bạn không có quyền" };
        }
      }

      await key.update({
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: userId,
      });

      return { success: true, message: "Thu hồi mã đăng ký thành công" };
    } catch (error) {
      console.error("Revoke key error:", error);
      return {
        success: false,
        message: "Không thể thu hồi mã đăng ký",
        error: error.message,
      };
    }
  }

  /**
   * Get all enrollment keys (Admin only)
   */
  async getAllKeys() {
    try {
      const keys = await EnrollKey.findAll({
        include: [
          {
            model: Class,
            as: "class",
            attributes: ["classId", "classCode"],
            include: [
              {
                model: Course,
                as: "course",
                attributes: ["courseId", "courseCode", "courseName"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        data: keys.map((k) => ({
          ...k.toJSON(),
          isValid: k.isValid(),
          remainingUses: k.maxUses ? k.maxUses - k.usedCount : null,
        })),
      };
    } catch (error) {
      console.error("Get all keys error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách mã đăng ký",
        error: error.message,
      };
    }
  }

  /**
   * Get keys for class
   */
  async getKeysByClass(classId, userId, userRole) {
    try {
      // Authorization
      if (userRole !== "Admin") {
        const inClass = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });

        if (!inClass) {
          return { success: false, message: "Bạn không có quyền" };
        }
      }

      const keys = await EnrollKey.findAll({
        where: { classId },
        include: [
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        data: keys.map((k) => ({
          ...k.toJSON(),
          isValid: k.isValid(),
          remainingUses: k.maxUses ? k.maxUses - k.usedCount : null,
        })),
      };
    } catch (error) {
      console.error("Get keys error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách mã đăng ký",
        error: error.message,
      };
    }
  }

  /**
   * Validate key and return class info (for student quick-join preview)
   * Does NOT require classId — finds key globally
   */
  async validateKey(keyValue) {
    try {
      const key = await EnrollKey.findOne({
        where: { keyValue },
        include: [
          {
            model: Class,
            as: "class",
            include: [
              {
                model: Course,
                as: "course",
                attributes: ["courseId", "courseCode", "courseName", "semester", "academicYear"],
              },
              {
                model: User,
                as: "instructors",
                through: { attributes: [] },
                attributes: ["userId", "firstName", "lastName", "username"],
                required: false,
              },
            ],
          },
        ],
      });

      if (!key) {
        return { success: false, message: "Mã đăng ký không hợp lệ" };
      }

      if (!key.isValid()) {
        return {
          success: false,
          message:
            "Mã đăng ký đã hết hạn, bị vô hiệu hóa hoặc đã đạt giới hạn sử dụng",
        };
      }

      const classData = key.class?.toJSON ? key.class.toJSON() : key.class;

      return {
        success: true,
        key: {
          keyId: key.keyId,
          classId: key.classId,
          class: {
            classId: classData?.classId,
            classCode: classData?.classCode,
            className: classData?.className,
            status: classData?.status,
            maxStudents: classData?.maxStudents,
            course: classData?.course,
            instructors: classData?.instructors || [],
          },
        },
      };
    } catch (error) {
      console.error("Validate key error:", error);
      return {
        success: false,
        message: "Không thể xác thực mã đăng ký",
        error: error.message,
      };
    }
  }
}

module.exports = new EnrollKeyService();
