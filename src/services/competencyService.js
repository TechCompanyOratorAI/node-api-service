"use strict";

const db = require("../models");
const auditLogService = require("./auditLogService");
const { AUDIT_ACTIONS, AUDIT_STATUSES } = require("../constants/businessConstants");

const {
  CompetencyCatalog,
  Department,
  SubjectArea,
  InstructorCompetency,
  InstructorCompetencyEvidence,
  Course,
  Class,
  ClassInstructor,
  User,
  UserRole,
  Role,
} = db;

const INSTRUCTOR_COMPETENCY_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

class CompetencyService {
  normalizePositiveInt(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }

  normalizeLevel(level) {
    const parsed = parseInt(level, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
    return parsed;
  }

  async listCompetencies(filters = {}) {
    try {
      const where = {};
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive === true || filters.isActive === "true";
      }
      if (filters.departmentId) where.departmentId = parseInt(filters.departmentId, 10);
      if (filters.subjectAreaId) where.subjectAreaId = parseInt(filters.subjectAreaId, 10);
      if (filters.search) {
        where[db.Sequelize.Op.or] = [
          { competencyCode: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
          { competencyName: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        ];
      }

      const data = await CompetencyCatalog.findAll({
        where,
        order: [["competencyCode", "ASC"]],
      });

      return { success: true, data };
    } catch (error) {
      console.error("List competencies error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async createCompetency(payload, actorUserId) {
    try {
      const competencyCode = (payload.competencyCode || "").trim().toUpperCase();
      const competencyName = (payload.competencyName || "").trim();

      if (!competencyCode || !competencyName) {
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      const existing = await CompetencyCatalog.findOne({ where: { competencyCode } });
      if (existing) {
        return { success: false, message: "Competency code đã tồn tại" };
      }

      const departmentId =
        payload.departmentId !== undefined && payload.departmentId !== null
          ? parseInt(payload.departmentId, 10)
          : null;
      const subjectAreaId =
        payload.subjectAreaId !== undefined && payload.subjectAreaId !== null
          ? parseInt(payload.subjectAreaId, 10)
          : null;

      let department = null;
      if (departmentId !== null) {
        department = await Department.findOne({ where: { departmentId, isActive: true } });
        if (!department) return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      let subjectArea = null;
      if (subjectAreaId !== null) {
        subjectArea = await SubjectArea.findOne({ where: { subjectAreaId, isActive: true } });
        if (!subjectArea) return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      if (department && subjectArea && subjectArea.departmentId && subjectArea.departmentId !== department.departmentId) {
        return {
          success: false,
          message: "Có lỗi xảy ra",
        };
      }

      const competency = await CompetencyCatalog.create({
        competencyCode,
        competencyName,
        description: payload.description || null,
        departmentId: departmentId !== null ? departmentId : subjectArea?.departmentId || null,
        subjectAreaId,
        isActive: payload.isActive !== undefined ? !!payload.isActive : true,
      });

      await auditLogService.log({
        actorUserId,
        action: AUDIT_ACTIONS.COMPETENCY_CREATED,
        entityType: "CompetencyCatalog",
        entityId: competency.competencyId,
        status: AUDIT_STATUSES.SUCCESS,
        metadata: { competencyCode },
      });

      return { success: true, message: "Competency đã tạo thành công", competency };
    } catch (error) {
      console.error("Create competency error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  normalizeInstructorCompetencyPayload(payload) {
    if (Array.isArray(payload?.competencies)) return payload.competencies;
    if (Array.isArray(payload)) return payload;
    if (payload?.competencyId) return [payload];
    return [];
  }

  async declareInstructorCompetencies(instructorId, payload, actorUserId) {
    const transaction = await db.sequelize.transaction();
    try {
      const normalizedInstructorId = parseInt(instructorId, 10);
      const competencies = this.normalizeInstructorCompetencyPayload(payload);
      if (!competencies.length) {
        await transaction.rollback();
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      const instructor = await User.findByPk(normalizedInstructorId, { transaction });
      if (!instructor) {
        await transaction.rollback();
        return { success: false, message: "Không tìm thấy giảng viên" };
      }

      const competencyIds = [...new Set(competencies.map((r) => parseInt(r.competencyId, 10)).filter(Boolean))];
      const existingCompetencies = await CompetencyCatalog.findAll({
        where: { competencyId: competencyIds, isActive: true },
        transaction,
      });
      if (existingCompetencies.length !== competencyIds.length) {
        await transaction.rollback();
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      if (instructor.departmentId) {
        const invalidCompetency = existingCompetencies.find(
          (item) => item.departmentId && item.departmentId !== instructor.departmentId
        );
        if (invalidCompetency) {
          await transaction.rollback();
          return {
            success: false,
            message: `Competency ${invalidCompetency.competencyCode} does not belong to instructor department`,
          };
        }
      }

      const results = [];
      for (const item of competencies) {
        const competencyId = parseInt(item.competencyId, 10);
        const level = item.level === undefined || item.level === null
          ? 1
          : this.normalizeLevel(item.level);
        if (!level) {
          await transaction.rollback();
          return { success: false, message: `Dữ liệu không hợp lệ` };
        }

        const existing = await InstructorCompetency.findOne({
          where: { instructorId: normalizedInstructorId, competencyId },
          transaction,
        });

        let record = existing;
        if (existing) {
          await existing.update(
            {
              level,
              status: INSTRUCTOR_COMPETENCY_STATUS.PENDING,
              declaredAt: new Date(),
              approvedAt: null,
              approvedBy: null,
              rejectionReason: null,
            },
            { transaction }
          );
        } else {
          record = await InstructorCompetency.create(
            {
              instructorId: normalizedInstructorId,
              competencyId,
              level,
              status: INSTRUCTOR_COMPETENCY_STATUS.PENDING,
              declaredAt: new Date(),
            },
            { transaction }
          );
        }

        if (Array.isArray(item.evidences) && item.evidences.length) {
          for (const ev of item.evidences) {
            if (!ev || !ev.title) continue;
            await InstructorCompetencyEvidence.create(
              {
                instructorCompetencyId: record.instructorCompetencyId,
                evidenceType: ev.evidenceType || "other",
                title: ev.title,
                url: ev.url || null,
                notes: ev.notes || null,
                submittedAt: new Date(),
              },
              { transaction }
            );
          }
        }
        results.push(record);
      }

      await transaction.commit();

      await auditLogService.log({
        actorUserId,
        action: AUDIT_ACTIONS.INSTRUCTOR_COMPETENCY_SUBMITTED,
        entityType: "User",
        entityId: normalizedInstructorId,
        status: AUDIT_STATUSES.SUCCESS,
        metadata: {
          instructorId: normalizedInstructorId,
          competencyCount: results.length,
        },
      });

      return { success: true, message: "Khai báo năng lực thành công", data: results };
    } catch (error) {
      await transaction.rollback();
      console.error("Declare instructor competencies error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async getInstructorCompetencies(instructorId) {
    try {
      const normalizedInstructorId = this.normalizePositiveInt(instructorId);
      if (!normalizedInstructorId) {
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      const instructor = await User.findByPk(normalizedInstructorId, {
        attributes: ["userId", "username", "firstName", "lastName", "email", "departmentId", "studyMajor"],
      });
      if (!instructor) return { success: false, message: "Không tìm thấy giảng viên" };

      const data = await InstructorCompetency.findAll({
        where: { instructorId: normalizedInstructorId },
        include: [
          {
            model: CompetencyCatalog,
            as: "competency",
          },
          {
            model: InstructorCompetencyEvidence,
            as: "evidences",
            required: false,
          },
        ],
        order: [["updatedAt", "DESC"]],
      });

      return { success: true, instructor, data };
    } catch (error) {
      console.error("Get instructor competencies error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async approveInstructorCompetency(instructorCompetencyId, payload, approverId) {
    try {
      const record = await InstructorCompetency.findByPk(instructorCompetencyId);
      if (!record) return { success: false, message: "Instructor competency không tìm thấy" };

      if (payload.level !== undefined && payload.level !== null) {
        const normalizedLevel = this.normalizeLevel(payload.level);
        if (!normalizedLevel) {
          return { success: false, message: "Có lỗi xảy ra" };
        }
        await record.update({ level: normalizedLevel });
      }

      const approved = payload.approved !== undefined ? !!payload.approved : payload.status === "approved";
      if (approved) {
        await record.update({
          status: INSTRUCTOR_COMPETENCY_STATUS.APPROVED,
          approvedAt: new Date(),
          approvedBy: approverId,
          rejectionReason: null,
        });
      } else {
        await record.update({
          status: INSTRUCTOR_COMPETENCY_STATUS.REJECTED,
          approvedAt: new Date(),
          approvedBy: approverId,
          rejectionReason: payload.rejectionReason || payload.reason || null,
        });
      }

      await auditLogService.log({
        actorUserId: approverId,
        action: AUDIT_ACTIONS.INSTRUCTOR_COMPETENCY_REVIEWED,
        entityType: "InstructorCompetency",
        entityId: record.instructorCompetencyId,
        status: AUDIT_STATUSES.SUCCESS,
        reason: approved ? null : record.rejectionReason,
        metadata: {
          instructorId: record.instructorId,
          competencyId: record.competencyId,
          status: record.status,
        },
      });

      return { success: true, message: "Instructor competency đã cập nhật", data: record };
    } catch (error) {
      console.error("Approve instructor competency error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async deleteInstructorCompetency(instructorCompetencyId, actorUserId) {
    try {
      const normalizedId = this.normalizePositiveInt(instructorCompetencyId);
      if (!normalizedId) {
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }

      const record = await InstructorCompetency.findByPk(normalizedId);
      if (!record) return { success: false, message: "Instructor competency không tìm thấy" };

      await InstructorCompetencyEvidence.destroy({
        where: { instructorCompetencyId: normalizedId },
      });
      await record.destroy();

      await auditLogService.log({
        actorUserId,
        action: AUDIT_ACTIONS.INSTRUCTOR_COMPETENCY_DELETED,
        entityType: "InstructorCompetency",
        entityId: normalizedId,
        status: AUDIT_STATUSES.SUCCESS,
        metadata: {
          instructorId: record.instructorId,
          competencyId: record.competencyId,
        },
      });

      return { success: true, message: "Instructor competency đã xóa" };
    } catch (error) {
      console.error("Delete instructor competency error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async evaluateInstructorEligibilityForCourse(courseId, instructorId, options = {}) {
    try {
      const normalizedCourseId = parseInt(courseId, 10);
      const normalizedInstructorId = parseInt(instructorId, 10);

      const [course, instructor] = await Promise.all([
        Course.findByPk(normalizedCourseId),
        User.findByPk(normalizedInstructorId, {
          include: [
            {
              model: InstructorCompetency,
              as: "instructorCompetencies",
              where: { status: INSTRUCTOR_COMPETENCY_STATUS.APPROVED },
              required: false,
              include: [{ model: CompetencyCatalog, as: "competency" }],
            },
          ],
        }),
      ]);

      if (!course || !instructor) {
        return { success: false, message: "Không tìm thấy dữ liệu" };
      }

      const reasons = [];

      if (course.departmentId && instructor.departmentId && course.departmentId !== instructor.departmentId) {
        reasons.push("Department mismatch");
      }

      const approvedCompetencies = instructor.instructorCompetencies || [];
      const competencyGaps = [];

      // Course-level competency baseline:
      // Instructor must have at least one approved competency in the same department as course
      // (or no department binding on competency record).
      const departmentRelevantApproved = approvedCompetencies.filter((item) => {
        const competencyDeptId = item.competency?.departmentId || null;
        if (!course.departmentId) return true;
        return competencyDeptId === null || competencyDeptId === course.departmentId;
      });
      if (departmentRelevantApproved.length === 0) {
        competencyGaps.push({
          competencyId: null,
          competencyCode: null,
          requiredLevel: null,
          instructorLevel: null,
          reason: "no_approved_competency_for_course_department",
        });
        reasons.push("Missing approved competency");
      }

      // Subject area check:
      // If course has subjectAreaId, instructor must have at least one approved competency
      // mapped to that subject area (or generic competency without subjectArea).
      if (course.subjectAreaId) {
        const subjectAreaMatched = approvedCompetencies.some((item) => {
          const competencySubjectAreaId = item.competency?.subjectAreaId || null;
          return competencySubjectAreaId === null || competencySubjectAreaId === course.subjectAreaId;
        });
        if (!subjectAreaMatched) {
          competencyGaps.push({
            competencyId: null,
            competencyCode: null,
            requiredLevel: null,
            instructorLevel: null,
            reason: "no_approved_competency_for_course_subject_area",
          });
          reasons.push("Subject area competency mismatch");
        }
      }

      const today = new Date();
      const activeClassCount = await ClassInstructor.count({
        where: { instructorId: normalizedInstructorId },
        include: [
          {
            model: Class,
            as: "class",
            required: true,
            where: {
              status: "active",
              [db.Sequelize.Op.or]: [{ endDate: null }, { endDate: { [db.Sequelize.Op.gte]: today } }],
            },
          },
        ],
      });
      const maxActiveLoad = parseInt(process.env.MAX_INSTRUCTOR_ACTIVE_CLASS_LOAD || "4", 10);
      if (activeClassCount >= maxActiveLoad) reasons.push("Instructor workload exceeded");

      let scheduleOverlap = [];
      if (options.classContext?.startDate && options.classContext?.endDate) {
        const ctxStart = new Date(options.classContext.startDate);
        const ctxEnd = new Date(options.classContext.endDate);
        if (ctxStart < ctxEnd) {
          const assignedClasses = await Class.findAll({
            attributes: ["classId", "classCode", "startDate", "endDate", "status"],
            include: [
              {
                model: ClassInstructor,
                as: "classInstructors",
                where: { instructorId: normalizedInstructorId },
                attributes: [],
                required: true,
              },
            ],
            where: {
              classId: { [db.Sequelize.Op.ne]: options.classContext.classId || 0 },
              status: "active",
              startDate: { [db.Sequelize.Op.lte]: options.classContext.endDate },
              endDate: { [db.Sequelize.Op.gte]: options.classContext.startDate },
            },
          });
          scheduleOverlap = assignedClasses.map((item) => ({
            classId: item.classId,
            classCode: item.classCode,
            startDate: item.startDate,
            endDate: item.endDate,
          }));
          if (scheduleOverlap.length) reasons.push("Schedule overlap");
        }
      }

      return {
        success: true,
        eligible: reasons.length === 0,
        reasons,
        competencyGaps,
        workload: { activeClassCount, maxActiveLoad },
        scheduleOverlap,
      };
    } catch (error) {
      console.error("Evaluate instructor eligibility error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async getEligibleInstructors(courseId, options = {}) {
    try {
      const normalizedCourseId = parseInt(courseId, 10);
      const course = await Course.findByPk(normalizedCourseId);
      if (!course) return { success: false, message: "Môn học không tìm thấy" };

      const where = { isActive: true };
      if (course.departmentId) where.departmentId = course.departmentId;

      const instructors = await User.findAll({
        where,
        attributes: ["userId", "username", "firstName", "lastName", "email", "departmentId", "studyMajor"],
        include: [
          {
            model: UserRole,
            as: "userRoles",
            required: true,
            include: [{ model: Role, as: "role", required: true, where: { roleName: "Instructor" } }],
          },
        ],
      });

      const includeIneligible = options.includeIneligible === true || options.includeIneligible === "true";
      const evaluated = [];
      for (const instructor of instructors) {
        const eligibility = await this.evaluateInstructorEligibilityForCourse(normalizedCourseId, instructor.userId);
        if (!eligibility.success) continue;

        const item = {
          instructor: {
            userId: instructor.userId,
            username: instructor.username,
            firstName: instructor.firstName,
            lastName: instructor.lastName,
            email: instructor.email,
            departmentId: instructor.departmentId,
            studyMajor: instructor.studyMajor,
          },
          eligibility,
        };
        if (eligibility.eligible || includeIneligible) evaluated.push(item);
      }

      return {
        success: true,
        data: evaluated,
        total: evaluated.length,
      };
    } catch (error) {
      console.error("Get eligible instructors error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }
}

module.exports = new CompetencyService();
