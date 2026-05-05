"use strict";

const db = require("../models");
const {
  Class,
  ClassAcademicBlock,
  ClassInstructor,
  Course,
  CourseAcademicBlock,
  CourseInstructor,
  User,
  Enrollment,
  Presentation,
  EnrollKey,
  Topic,
  AcademicBlock,
  TopicEnrollment,
} = db;
const { Op } = require("sequelize");
const { emitUploadPermissionChanged } = require("../websocket/emitters");
const auditLogService = require("./auditLogService");
const competencyService = require("./competencyService");
const {
  AUDIT_ACTIONS,
  AUDIT_STATUSES,
} = require("../constants/businessConstants");

class ClassService {
  async getOccupiedTopicGroupCount(topicId) {
    const enrolledGroups = await TopicEnrollment.findAll({
      where: {
        topicId,
        status: "enrolled",
        groupId: { [Op.ne]: null },
      },
      attributes: ["groupId"],
      group: ["groupId"],
      raw: true,
    });

    const presentationGroups = await Presentation.findAll({
      where: {
        topicId,
        groupCode: { [Op.ne]: null },
      },
      attributes: ["groupCode"],
      group: ["groupCode"],
      raw: true,
    });

    const occupiedGroups = new Set();

    enrolledGroups.forEach((row) => {
      if (row.groupId !== null && row.groupId !== undefined) {
        occupiedGroups.add(String(row.groupId));
      }
    });

    presentationGroups.forEach((row) => {
      if (
        row.groupCode !== null &&
        row.groupCode !== undefined &&
        String(row.groupCode).trim()
      ) {
        occupiedGroups.add(String(row.groupCode).trim());
      }
    });

    return occupiedGroups.size;
  }

  normalizeClassBlockIds(payload = {}) {
    if (Array.isArray(payload.academicBlockIds)) {
      return [
        ...new Set(
          payload.academicBlockIds
            .map((id) => parseInt(id, 10))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ];
    }
    if (
      payload.academicBlockId !== undefined &&
      payload.academicBlockId !== null
    ) {
      const parsed = parseInt(payload.academicBlockId, 10);
      return Number.isInteger(parsed) && parsed > 0 ? [parsed] : [];
    }
    return [];
  }

  async getAllowedCourseBlockIds(courseId, transaction = null) {
    const mappings = await CourseAcademicBlock.findAll({
      where: { courseId },
      attributes: ["academicBlockId", "isPrimary"],
      order: [
        ["isPrimary", "DESC"],
        ["courseAcademicBlockId", "ASC"],
      ],
      transaction,
    });
    return mappings.map((mapping) => mapping.academicBlockId);
  }

  resolveClassAcademicBlockId(requestedBlockId, allowedBlockIds) {
    const normalizedRequestedBlockId =
      requestedBlockId === undefined || requestedBlockId === null
        ? requestedBlockId
        : parseInt(requestedBlockId, 10);

    if (!allowedBlockIds.length) {
      return {
        success: true,
        academicBlockId: normalizedRequestedBlockId || null,
      };
    }

    if (
      normalizedRequestedBlockId !== undefined &&
      normalizedRequestedBlockId !== null
    ) {
      if (!allowedBlockIds.includes(normalizedRequestedBlockId)) {
        return {
          success: false,
          message: "Academic block không phạm vi của khóa học",
        };
      }
      return {
        success: true,
        academicBlockId: normalizedRequestedBlockId,
      };
    }

    if (allowedBlockIds.length === 1) {
      return {
        success: true,
        academicBlockId: allowedBlockIds[0],
      };
    }

    return {
      success: false,
      message: "Dữ liệu không hợp lệ",
    };
  }

  resolveClassAcademicBlockIds(requestedBlockIds, allowedBlockIds) {
    if (!allowedBlockIds.length) {
      return { success: true, academicBlockIds: requestedBlockIds };
    }

    if (requestedBlockIds.length > 0) {
      const invalid = requestedBlockIds.filter(
        (id) => !allowedBlockIds.includes(id),
      );
      if (invalid.length > 0) {
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }
      return { success: true, academicBlockIds: requestedBlockIds };
    }

    if (allowedBlockIds.length === 1) {
      return { success: true, academicBlockIds: [allowedBlockIds[0]] };
    }

    return { success: false, message: "Dữ liệu không hợp lệ" };
  }

  async syncClassAcademicBlocks(classId, academicBlockIds, transaction) {
    await ClassAcademicBlock.destroy({
      where: { classId },
      transaction,
    });

    if (!academicBlockIds.length) return;
    await ClassAcademicBlock.bulkCreate(
      academicBlockIds.map((blockId, index) => ({
        classId,
        academicBlockId: blockId,
        isPrimary: index === 0,
      })),
      { transaction },
    );
  }

  async getClassAcademicBlockIds(classId, transaction = null) {
    const mappings = await ClassAcademicBlock.findAll({
      where: { classId },
      attributes: ["academicBlockId", "isPrimary"],
      order: [
        ["isPrimary", "DESC"],
        ["classAcademicBlockId", "ASC"],
      ],
      transaction,
    });
    return mappings.map((mapping) => mapping.academicBlockId);
  }

  async validateClassDateWithinBlocks(
    academicBlockIds,
    startDate,
    endDate,
    entityLabel = "Class",
  ) {
    if (!academicBlockIds.length) {
      return {
        success: true,
        startDate,
        endDate,
        primaryAcademicBlockId: null,
      };
    }

    const blocks = await AcademicBlock.findAll({
      where: { academicBlockId: academicBlockIds, isActive: true },
    });
    if (blocks.length !== academicBlockIds.length) {
      return { success: false, message: "Dữ liệu không hợp lệ" };
    }

    // FPT rule: one class must belong to only one term (SPRING or SUMMER or FALL)
    // Course can span multiple terms, but each class is opened per-term.
    const distinctTerms = [...new Set(blocks.map((block) => block.term))];
    if (distinctTerms.length > 1) {
      return {
        success: false,
        message:
          "Một lớp chỉ được thuộc một kỳ (term). Sang kỳ mới phải tạo lớp mới.",
      };
    }

    const distinctAcademicYears = [
      ...new Set(blocks.map((block) => block.academicYearId)),
    ];
    if (distinctAcademicYears.length > 1) {
      return {
        success: false,
        message: "Một lớp chỉ được thuộc một niên khóa.",
      };
    }

    const minStart = blocks.reduce(
      (acc, block) =>
        !acc || new Date(block.startDate) < new Date(acc)
          ? block.startDate
          : acc,
      null,
    );
    const maxEnd = blocks.reduce(
      (acc, block) =>
        !acc || new Date(block.endDate) > new Date(acc) ? block.endDate : acc,
      null,
    );
    const nextStart = startDate || minStart;
    const nextEnd = endDate || maxEnd;

    if (new Date(nextStart) >= new Date(nextEnd)) {
      return {
        success: false,
        message: `${entityLabel} endDate must be after startDate`,
      };
    }
    if (
      new Date(nextStart) < new Date(minStart) ||
      new Date(nextEnd) > new Date(maxEnd)
    ) {
      return {
        success: false,
        message: `${entityLabel} dates must be inside selected academic blocks range`,
      };
    }

    return {
      success: true,
      startDate: nextStart,
      endDate: nextEnd,
      primaryAcademicBlockId: academicBlockIds[0] || null,
    };
  }

  /**
   * Create new class (Admin only)
   */
  async createClass(classData, userId, userRoles = []) {
    const {
      courseId,
      classCode,
      startDate,
      endDate,
      maxStudents,
      maxGroupMembers,
    } = classData;
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
        transaction,
      });
      if (existing) {
        await transaction.rollback();
        return {
          success: false,
          message: "Mã lớp đã tồn tại trong khóa học này",
        };
      }

      const requestedBlockIds = this.normalizeClassBlockIds(classData);
      const allowedBlockIds = await this.getAllowedCourseBlockIds(
        courseId,
        transaction,
      );
      const blockSelection = this.resolveClassAcademicBlockIds(
        requestedBlockIds,
        allowedBlockIds,
      );
      if (!blockSelection.success) {
        await transaction.rollback();
        return blockSelection;
      }
      const finalBlockIds = blockSelection.academicBlockIds;
      const dateValidation = await this.validateClassDateWithinBlocks(
        finalBlockIds,
        startDate,
        endDate,
        "Class",
      );
      if (!dateValidation.success) {
        await transaction.rollback();
        return dateValidation;
      }

      // Create class
      const newClass = await Class.create(
        {
          courseId,
          academicBlockId: dateValidation.primaryAcademicBlockId || null,
          classCode,
          status: "active",
          startDate: dateValidation.startDate || null,
          endDate: dateValidation.endDate || null,
          maxStudents,
          maxGroupMembers,
          createdBy: userId,
        },
        { transaction },
      );
      await this.syncClassAcademicBlocks(
        newClass.classId,
        finalBlockIds,
        transaction,
      );

      const isAdmin = userRoles.includes("Admin");
      const isInstructor = userRoles.includes("Instructor");

      // Only instructor creators should be auto-assigned to the class.
      if (isInstructor && !isAdmin) {
        await ClassInstructor.create(
          {
            classId: newClass.classId,
            instructorId: userId,
            assignedBy: userId,
          },
          { transaction },
        );
      }

      await transaction.commit();

      return {
        success: true,
        message: "Tạo lớp học thành công",
        class: {
          ...newClass.toJSON(),
          academicBlockIds: finalBlockIds,
        },
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
          return {
            success: true,
            data: [],
            pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
          };
        }

        where.classId = { [Op.in]: instructorClassIds };
      }
      // Admin can see all classes in course

      const { count, rows: classes } = await Class.findAndCountAll({
        where,
        include: [
          {
            model: AcademicBlock,
            as: "academicBlocks",
            through: { attributes: ["isPrimary"] },
            required: false,
          },
          {
            model: Course,
            as: "course",
            attributes: [
              "courseId",
              "courseCode",
              "courseName",
              "academicBlockId",
            ],
            include: [
              {
                model: db.AcademicBlock,
                as: "academicBlocks",
                through: { attributes: ["isPrimary"] },
                required: false,
              },
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
            academicBlockIds: (c.academicBlocks || []).map(
              (b) => b.academicBlockId,
            ),
            enrollmentCount: c.enrollments?.length || 0,
            activeKeyCount: c.enrollKeys?.filter((k) => k.isActive).length || 0,
          };

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
            model: AcademicBlock,
            as: "academicBlocks",
            through: { attributes: ["isPrimary"] },
            required: false,
          },
          {
            model: Course,
            as: "course",
            attributes: [
              "courseId",
              "courseCode",
              "courseName",
              "academicBlockId",
            ],
            include: [
              {
                model: db.AcademicBlock,
                as: "academicBlocks",
                through: { attributes: ["isPrimary"] },
                required: false,
              },
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
            academicBlockIds: (c.academicBlocks || []).map(
              (b) => b.academicBlockId,
            ),
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
            model: AcademicBlock,
            as: "academicBlocks",
            through: { attributes: ["isPrimary"] },
            required: false,
          },
          {
            model: Course,
            as: "course",
            attributes: [
              "courseId",
              "courseCode",
              "courseName",
              "semester",
              "academicYear",
              "academicBlockId",
            ],
            include: [
              {
                model: db.AcademicBlock,
                as: "academicBlocks",
                through: { attributes: ["isPrimary"] },
                required: false,
              },
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
          academicBlockIds: (c.academicBlocks || []).map(
            (b) => b.academicBlockId,
          ),
          academicBlocks: c.academicBlocks || [],
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
            model: AcademicBlock,
            as: "academicBlocks",
            through: { attributes: ["isPrimary"] },
            required: false,
          },
          {
            model: Course,
            as: "course",
            attributes: [
              "courseId",
              "courseCode",
              "courseName",
              "semester",
              "academicYear",
              "academicBlockId",
            ],
            include: [
              {
                model: db.AcademicBlock,
                as: "academicBlocks",
                through: { attributes: ["isPrimary"] },
                required: false,
              },
            ],
          },
          {
            model: Topic,
            as: "topics",
            attributes: [
              "topicId",
              "topicName",
              "description",
              "submissionStartDate",
              "submissionDeadline",
              "minGroups",
              "maxGroups",
              "maxDurationMinutes",
              "requirements",
            ],
            required: false,
            order: [["topicId", "ASC"]],
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
            return {
              success: false,
              message: "Bạn không có quyền truy cập lớp học này",
            };
          }
        } else if (userRole === "Student") {
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

      const response = classData.toJSON();
      if (userRole === "Student") {
        delete response.enrollKeys;
      }

      return {
        success: true,
        class: {
          ...response,
          academicBlockIds: (response.academicBlocks || []).map(
            (b) => b.academicBlockId,
          ),
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
          transaction,
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
      const { enrollKey, keyExpiresAt, keyMaxUses, ...rawClassUpdates } =
        updates;
      let classUpdates = rawClassUpdates;

      if (userRole === "Instructor") {
        classUpdates = {};
        if (rawClassUpdates.maxGroupMembers !== undefined) {
          classUpdates.maxGroupMembers = rawClassUpdates.maxGroupMembers;
        }
      }

      // Update class info
      const allowedBlockIds = await this.getAllowedCourseBlockIds(
        classData.courseId,
        transaction,
      );
      const hasBlocksInPayload =
        Array.isArray(classUpdates.academicBlockIds) ||
        classUpdates.academicBlockId !== undefined;
      const requestedBlockIds = hasBlocksInPayload
        ? this.normalizeClassBlockIds(classUpdates)
        : await this.getClassAcademicBlockIds(classId, transaction);
      const blockSelection = this.resolveClassAcademicBlockIds(
        requestedBlockIds,
        allowedBlockIds,
      );
      if (!blockSelection.success) {
        await transaction.rollback();
        return blockSelection;
      }
      const nextBlockIds = blockSelection.academicBlockIds;
      const hasStartDateInPayload = classUpdates.startDate !== undefined;
      const hasEndDateInPayload = classUpdates.endDate !== undefined;
      const nextStartDate = hasStartDateInPayload
        ? classUpdates.startDate
        : hasBlocksInPayload
          ? null
          : classData.startDate;
      const nextEndDate = hasEndDateInPayload
        ? classUpdates.endDate
        : hasBlocksInPayload
          ? null
          : classData.endDate;
      const dateValidation = await this.validateClassDateWithinBlocks(
        nextBlockIds,
        nextStartDate,
        nextEndDate,
        "Class",
      );
      if (!dateValidation.success) {
        await transaction.rollback();
        return dateValidation;
      }

      if (hasBlocksInPayload) {
        classUpdates.academicBlockId =
          dateValidation.primaryAcademicBlockId || null;
      }
      if (!hasStartDateInPayload && hasBlocksInPayload) {
        classUpdates.startDate = dateValidation.startDate || null;
      }
      if (!hasEndDateInPayload && hasBlocksInPayload) {
        classUpdates.endDate = dateValidation.endDate || null;
      }
      if (classUpdates.academicBlockIds !== undefined)
        delete classUpdates.academicBlockIds;

      await classData.update(classUpdates, { transaction });
      if (hasBlocksInPayload) {
        await this.syncClassAcademicBlocks(classId, nextBlockIds, transaction);
      }

      // Update enrollment key if provided
      if (
        enrollKey !== undefined ||
        keyExpiresAt !== undefined ||
        keyMaxUses !== undefined
      ) {
        // Find active enrollment key for this class
        const activeKey = await EnrollKey.findOne({
          where: {
            classId,
            isActive: true,
            isRevoked: false,
          },
          order: [["createdAt", "DESC"]],
          transaction,
        });

        if (activeKey) {
          // Update existing key
          const keyUpdates = {};
          if (enrollKey !== undefined) keyUpdates.keyValue = enrollKey;
          if (keyExpiresAt !== undefined)
            keyUpdates.expiresAt = keyExpiresAt ? new Date(keyExpiresAt) : null;
          if (keyMaxUses !== undefined) keyUpdates.maxUses = keyMaxUses;

          await activeKey.update(keyUpdates, { transaction });
        } else if (enrollKey !== undefined) {
          await EnrollKey.create(
            {
              classId,
              keyValue: enrollKey,
              expiresAt: keyExpiresAt ? new Date(keyExpiresAt) : null,
              maxUses: keyMaxUses || null,
              usedCount: 0,
              isActive: true,
              isRevoked: false,
              createdBy: userId,
            },
            { transaction },
          );
        }
      }

      await transaction.commit();

      // Fetch updated class with full key info
      const updatedClass = await Class.findByPk(classId, {
        include: [
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

      return {
        success: true,
        message: "Cập nhật lớp học thành công",
        class: {
          ...updatedClass.toJSON(),
          academicBlockIds: await this.getClassAcademicBlockIds(classId),
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Update class error:", error);
      return {
        success: false,
        message: "KhÃ´ng thá»ƒ cáº­p nháº­t lá»›p há»c",
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
  async assignInstructor(classId, instructorId, assignedBy, options = {}) {
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

      const actorRoles = Array.isArray(options.actorRoles)
        ? options.actorRoles
        : [];
      const canOverride =
        actorRoles.includes("Admin") ||
        actorRoles.includes("AcademicCoordinator");
      const overrideReason =
        typeof options.overrideReason === "string"
          ? options.overrideReason.trim()
          : "";

      const eligibility =
        await competencyService.evaluateInstructorEligibilityForCourse(
          classData.courseId,
          instructorId,
          {
            classContext: {
              classId,
              startDate: classData.startDate,
              endDate: classData.endDate,
            },
          },
        );

      if (!eligibility.success) {
        return {
          success: false,
          message:
            eligibility.message || "Unable to evaluate instructor eligibility",
          error: eligibility.error,
        };
      }

      if (!eligibility.eligible && !(canOverride && overrideReason)) {
        return {
          success: false,
          message:
            "Giảng viên chưa đủ điều kiện phụ trách lớp (cần overrideReason nếu muốn override)",
          eligibility,
        };
      }

      const isOverrideAssignment = !eligibility.eligible;

      // Assign
      await ClassInstructor.create({
        classId,
        instructorId,
        assignedBy,
        assignmentStatus: isOverrideAssignment ? "override" : "eligible",
        overrideReason: isOverrideAssignment ? overrideReason : null,
        overrideBy: isOverrideAssignment ? assignedBy : null,
        overrideAt: isOverrideAssignment ? new Date() : null,
      });

      await auditLogService.log({
        actorUserId: assignedBy,
        action: isOverrideAssignment
          ? AUDIT_ACTIONS.CLASS_INSTRUCTOR_OVERRIDDEN
          : AUDIT_ACTIONS.CLASS_INSTRUCTOR_ASSIGNED,
        entityType: "ClassInstructor",
        entityId: classId,
        status: AUDIT_STATUSES.SUCCESS,
        reason: isOverrideAssignment ? overrideReason : null,
        metadata: {
          classId,
          instructorId,
          assignmentStatus: isOverrideAssignment ? "override" : "eligible",
          eligibility,
        },
      });

      return {
        success: true,
        message: isOverrideAssignment
          ? "Giảng viên đã được phân công với lý do quá trình phụ trách"
          : "Giảng viên đã được phân công vào lớp học thành công",
        assignmentStatus: isOverrideAssignment ? "override" : "eligible",
      };
    } catch (error) {
      console.error("Assign instructor error:", error);
      return {
        success: false,
        message: "KhÃ´ng thá»ƒ phÃ¢n cÃ´ng giáº£ng viÃªn",
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
          return {
            success: false,
            message: "Bạn không có quyền tạo topic cho lớp này",
          };
        }
      }

      const {
        topicName,
        description,
        submissionStartDate,
        submissionDeadline,
        dueDate,
        minGroups,
        maxGroups,
        maxDurationMinutes,
        requirements,
      } = topicData;

      const normalizedSubmissionStartDate =
        submissionStartDate !== undefined ? submissionStartDate : null;
      const normalizedSubmissionDeadline =
        submissionDeadline !== undefined
          ? submissionDeadline
          : dueDate !== undefined
            ? dueDate
            : null;
      const normalizedMinGroups =
        minGroups !== undefined ? parseInt(minGroups, 10) : 1;
      const normalizedMaxGroups =
        maxGroups !== undefined ? parseInt(maxGroups, 10) : normalizedMinGroups;

      if (
        normalizedMinGroups < 1 ||
        normalizedMaxGroups < normalizedMinGroups
      ) {
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      if (
        normalizedSubmissionStartDate &&
        normalizedSubmissionDeadline &&
        new Date(normalizedSubmissionDeadline) <=
          new Date(normalizedSubmissionStartDate)
      ) {
        return {
          success: false,
          message: "submissionDeadline phải sau submissionStartDate",
        };
      }

      const topic = await Topic.create({
        classId,
        courseId: classData.courseId, // keep for reference
        topicName,
        description,
        sequenceNumber: null,
        dueDate: normalizedSubmissionDeadline,
        submissionStartDate: normalizedSubmissionStartDate,
        submissionDeadline: normalizedSubmissionDeadline,
        minGroups: normalizedMinGroups,
        maxGroups: normalizedMaxGroups,
        maxDurationMinutes,
        requirements,
      });

      return { success: true, message: "Tạo topic thành công", topic };
    } catch (error) {
      console.error("Create topic error:", error);
      return {
        success: false,
        message: "Không thể tạo topic",
        error: error.message,
      };
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
        order: [["topicId", "ASC"]],
      });

      return { success: true, topics };
    } catch (error) {
      console.error("Get topics by class error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách topic",
        error: error.message,
      };
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
          return {
            success: false,
            message: "Bạn không có quyền sửa topic này",
          };
        }
      }

      const {
        topicName,
        description,
        submissionStartDate,
        submissionDeadline,
        dueDate,
        minGroups,
        maxGroups,
        maxDurationMinutes,
        requirements,
      } = topicData;

      const nextSubmissionStartDate =
        submissionStartDate !== undefined
          ? submissionStartDate
          : topic.submissionStartDate;
      const nextSubmissionDeadline =
        submissionDeadline !== undefined
          ? submissionDeadline
          : dueDate !== undefined
            ? dueDate
            : topic.submissionDeadline;
      const nextMinGroups =
        minGroups !== undefined ? parseInt(minGroups, 10) : topic.minGroups;
      const nextMaxGroups =
        maxGroups !== undefined ? parseInt(maxGroups, 10) : topic.maxGroups;

      if (nextMinGroups < 1 || nextMaxGroups < nextMinGroups) {
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      const occupiedGroupCount = await this.getOccupiedTopicGroupCount(
        topic.topicId,
      );
      if (nextMaxGroups < occupiedGroupCount) {
        return {
          success: false,
          message: `Không thể giảm maxGroups xuống ${nextMaxGroups} vì topic đang có ${occupiedGroupCount} nhóm đã chọn hoặc đã nộp bài`,
        };
      }

      if (
        nextSubmissionStartDate &&
        nextSubmissionDeadline &&
        new Date(nextSubmissionDeadline) <= new Date(nextSubmissionStartDate)
      ) {
        return {
          success: false,
          message: "submissionDeadline phải sau submissionStartDate",
        };
      }

      await topic.update({
        topicName: topicName || topic.topicName,
        description:
          description !== undefined ? description : topic.description,
        sequenceNumber: null,
        dueDate: nextSubmissionDeadline,
        submissionStartDate: nextSubmissionStartDate,
        submissionDeadline: nextSubmissionDeadline,
        minGroups: nextMinGroups,
        maxGroups: nextMaxGroups,
        maxDurationMinutes:
          maxDurationMinutes !== undefined
            ? maxDurationMinutes
            : topic.maxDurationMinutes,
        requirements:
          requirements !== undefined ? requirements : topic.requirements,
      });

      return { success: true, message: "Cập nhật topic thành công", topic };
    } catch (error) {
      console.error("Update topic error:", error);
      return {
        success: false,
        message: "Không thể cập nhật topic",
        error: error.message,
      };
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
          return {
            success: false,
            message: "Bạn không có quyền xóa topic này",
          };
        }
      }

      const { Presentation } = db;
      const hasPresentation = await Presentation.count({ where: { topicId } });
      if (hasPresentation > 0) {
        return {
          success: false,
          message: "Không thể xóa topic đã có bài thuyết trình",
        };
      }

      await topic.destroy();
      return { success: true, message: "Xóa topic thành công" };
    } catch (error) {
      console.error("Delete topic error:", error);
      return {
        success: false,
        message: "Không thể xóa topic",
        error: error.message,
      };
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
        attributes: [
          "classId",
          "isUploadEnabled",
          "uploadStartDate",
          "uploadEndDate",
        ],
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

      // Replace: xóa cũ và insert mới
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

  /**
   * Add a single email to the whitelist (Admin/Instructor only)
   */
  async addSingleEmail(classId, email, userId, userRole) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData)
        return { success: false, message: "Không tìm thấy lớp học" };

      // Authorization
      if (userRole !== "Admin") {
        if (userRole !== "Instructor")
          return { success: false, message: "Bạn không có quyền thực hiện" };
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });
        if (!isInstructor)
          return { success: false, message: "Bạn không có quyền thực hiện" };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalizedEmail = email.trim().toLowerCase();
      if (!emailRegex.test(normalizedEmail)) {
        return { success: false, message: "Email không hợp lệ" };
      }

      const { ClassEmailWhitelist } = db;

      // Check duplicate
      const existing = await ClassEmailWhitelist.findOne({
        where: { classId, email: normalizedEmail },
      });
      if (existing)
        return { success: false, message: "Email này đã có trong danh sách" };

      const record = await ClassEmailWhitelist.create({
        classId,
        email: normalizedEmail,
      });

      return {
        success: true,
        message: `Đã thêm ${normalizedEmail} vào danh sách`,
        entry: { id: record.id, email: record.email },
      };
    } catch (error) {
      console.error("Add single email error:", error);
      return {
        success: false,
        message: "Không thể thêm email",
        error: error.message,
      };
    }
  }

  /**
   * Update (rename) a single email in the whitelist (Admin/Instructor only)
   */
  async updateSingleEmail(classId, oldEmail, newEmail, userId, userRole) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData)
        return { success: false, message: "Không tìm thấy lớp học" };

      // Authorization
      if (userRole !== "Admin") {
        if (userRole !== "Instructor")
          return { success: false, message: "Bạn không có quyền thực hiện" };
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });
        if (!isInstructor)
          return { success: false, message: "Bạn không có quyền thực hiện" };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalizedNew = newEmail.trim().toLowerCase();
      const normalizedOld = oldEmail.trim().toLowerCase();

      if (!emailRegex.test(normalizedNew)) {
        return { success: false, message: "Email mới không hợp lệ" };
      }

      const { ClassEmailWhitelist } = db;

      const existing = await ClassEmailWhitelist.findOne({
        where: { classId, email: normalizedOld },
      });
      if (!existing)
        return {
          success: false,
          message: "Email cũ không tồn tại trong danh sách",
        };

      // Check if new email already exists
      if (normalizedNew !== normalizedOld) {
        const duplicate = await ClassEmailWhitelist.findOne({
          where: { classId, email: normalizedNew },
        });
        if (duplicate)
          return {
            success: false,
            message: "Email mới đã tồn tại trong danh sách",
          };
      }

      await existing.update({ email: normalizedNew });

      return {
        success: true,
        message: `Đã cập nhật email thành ${normalizedNew}`,
        entry: { id: existing.id, email: normalizedNew },
      };
    } catch (error) {
      console.error("Update single email error:", error);
      return {
        success: false,
        message: "Không thể cập nhật email",
        error: error.message,
      };
    }
  }

  /**
   * Remove a single email from whitelist and optionally kick the student from class.
   * Admin/Instructor only.
   */
  async removeSingleEmail(classId, email, userId, userRole) {
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

      const normalizedEmail = email.trim().toLowerCase();
      const { ClassEmailWhitelist, User, Enrollment, Presentation } = db;

      // Remove from whitelist
      const deleted = await ClassEmailWhitelist.destroy({
        where: { classId, email: normalizedEmail },
        transaction,
      });
      if (deleted === 0) {
        await transaction.rollback();
        return {
          success: false,
          message: "Email không tồn tại trong danh sách",
        };
      }

      // Find and kick the student if enrolled
      let kicked = false;
      let kickDetail = null;
      const student = await User.findOne({
        where: { email: normalizedEmail },
        attributes: ["userId", "email"],
        transaction,
      });

      if (student) {
        const enrollment = await Enrollment.findOne({
          where: { classId, studentId: student.userId },
          transaction,
        });
        if (enrollment) {
          const presentationCount = await Presentation.count({
            where: { studentId: student.userId, classId },
            transaction,
          });
          if (presentationCount > 0) {
            await enrollment.update({ status: "dropped" }, { transaction });
          } else {
            await enrollment.destroy({ transaction });
          }
          kicked = true;
          kickDetail = {
            studentId: student.userId,
            email: normalizedEmail,
            hadPresentations: presentationCount > 0,
          };
        }
      }

      await transaction.commit();

      return {
        success: true,
        message: kicked
          ? `Đã xóa ${normalizedEmail} khỏi danh sách và kick sinh viên ra khỏi lớp`
          : `Đã xóa ${normalizedEmail} khỏi danh sách (sinh viên chưa join lớp)`,
        kicked,
        kickDetail,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Remove single email error:", error);
      return {
        success: false,
        message: "Không thể xóa email",
        error: error.message,
      };
    }
  }
}

module.exports = new ClassService();
