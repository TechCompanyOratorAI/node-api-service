"use strict";

const db = require("../models");
const { GroupGradeDistribution, GroupGradeMember, AIReport, Presentation, GroupStudent, Group, Enrollment, ClassInstructor } = db;
const { emitGradeDistributed, emitGradeFinalized } = require("../websocket/emitters");

class GroupGradeDistributionService {
  /**
   * Leader nộp / cập nhật điểm cho nhóm.
   *
   * Luật:
   *  - Lần 1: distribution chưa tồn tại → tạo mới, status = submitted, submittedCount = 1
   *  - Lần 2: status = reopened (instructor đã mở lại) → update, status = submitted, submittedCount = 2
   *  - Mọi trường hợp khác (submitted / finalized) → từ chối
   */
  async distributeGrade({ reportId, leaderStudentId, reason, members }) {
    const transaction = await db.sequelize.transaction();

    try {
      // 1. Validate AIReport tồn tại và đã confirmed
      const report = await AIReport.findByPk(reportId);
      if (!report) {
        await transaction.rollback();
        return { success: false, message: "AI Report không tìm thấy" };
      }
      if (report.reportStatus !== "confirmed") {
        await transaction.rollback();
        return {
          success: false,
          message: "Chỉ có thể chia điểm khi report đã được instructor xác nhận",
          code: "INVALID_REPORT_STATUS",
        };
      }

      // 2. Lấy presentation
      const presentation = await Presentation.findByPk(report.presentationId);
      if (!presentation) {
        await transaction.rollback();
        return { success: false, message: "Presentation không tìm thấy" };
      }

      // 3. Tìm TopicEnrollment → groupId
      const topicEnrollment = await db.TopicEnrollment.findOne({
        where: { topicId: presentation.topicId, status: "enrolled" },
      });
      if (!topicEnrollment?.groupId) {
        await transaction.rollback();
        return {
          success: false,
          message: "Presentation không thuộc nhóm nào, không thể chia điểm theo nhóm",
          code: "NOT_GROUP_TOPIC",
        };
      }
      const groupId = topicEnrollment.groupId;

      // 4. Validate leader
      const leaderMembership = await GroupStudent.findOne({
        where: { groupId, studentId: leaderStudentId, role: "leader" },
      });
      if (!leaderMembership) {
        await transaction.rollback();
        return {
          success: false,
          message: "Chỉ trưởng nhóm mới được phép chia điểm",
          code: "NOT_LEADER",
        };
      }

      // 5. Validate members
      const groupStudents = await GroupStudent.findAll({
        where: { groupId },
        attributes: ["studentId"],
      });
      const groupStudentIds = groupStudents.map((gs) => gs.studentId);
      const seenIds = new Set();

      for (const member of members) {
        if (!groupStudentIds.includes(member.studentId)) {
          await transaction.rollback();
          return { success: false, message: `Sinh viên ID ${member.studentId} không thuộc nhóm này`, code: "INVALID_MEMBER" };
        }
        if (member.percentage === undefined || member.percentage === null || isNaN(Number(member.percentage))) {
          await transaction.rollback();
          return { success: false, message: `Phần trăm của sinh viên ID ${member.studentId} không hợp lệ`, code: "INVALID_PERCENTAGE" };
        }
        if (member.percentage < 0 || member.percentage > 100) {
          await transaction.rollback();
          return { success: false, message: `Phần trăm của sinh viên ID ${member.studentId} phải từ 0 đến 100`, code: "INVALID_PERCENTAGE_RANGE" };
        }
        if (seenIds.has(member.studentId)) {
          await transaction.rollback();
          return { success: false, message: `Sinh viên ID ${member.studentId} xuất hiện nhiều hơn 1 lần`, code: "DUPLICATE_MEMBER" };
        }
        seenIds.add(member.studentId);
      }

      const instructorGrade = parseFloat(report.gradeForInstructor) || parseFloat(report.overallScore);

      // 6. Kiểm tra state machine
      let distribution = await GroupGradeDistribution.findOne({ where: { groupId, reportId } });

      if (distribution) {
        // Đã tồn tại → chỉ cho sửa khi status = reopened
        if (distribution.status === "finalized") {
          await transaction.rollback();
          return {
            success: false,
            message: "Điểm đã được chốt và không thể thay đổi",
            code: "ALREADY_FINALIZED",
          };
        }
        if (distribution.status === "submitted") {
          await transaction.rollback();
          return {
            success: false,
            message: "Bạn đã nộp điểm rồi. Chờ instructor mở lại mới được sửa.",
            code: "ALREADY_SUBMITTED",
          };
        }
        // status = reopened → cho phép cập nhật
        await GroupGradeMember.destroy({ where: { distributionId: distribution.id }, transaction });
        await distribution.update(
          {
            leaderStudentId,
            instructorGrade,
            reason,
            distributedAt: new Date(),
            status: "submitted",
            submittedCount: distribution.submittedCount + 1,
          },
          { transaction }
        );
      } else {
        // Lần đầu nộp
        distribution = await GroupGradeDistribution.create(
          {
            groupId,
            reportId,
            leaderStudentId,
            instructorGrade,
            reason,
            distributedAt: new Date(),
            status: "submitted",
            submittedCount: 1,
          },
          { transaction }
        );
      }

      // 7. Tạo members
      const gradeMembers = members.map((member) => {
        const percentage = parseFloat(member.percentage);
        const receivedGrade = parseFloat(((instructorGrade * percentage) / 100).toFixed(2));
        return {
          distributionId: distribution.id,
          studentId: member.studentId,
          percentage,
          receivedGrade,
          reason: member.reason || null,
          memberFeedback: null,
          feedbackAt: null,
          feedbackStatus: null,
        };
      });
      await GroupGradeMember.bulkCreate(gradeMembers, { transaction });

      // 8. Cập nhật Enrollment.finalGrade
      for (const member of gradeMembers) {
        await Enrollment.update(
          { finalGrade: member.receivedGrade },
          { where: { studentId: member.studentId, classId: presentation.classId }, transaction }
        );
      }

      await transaction.commit();

      // 9. Load lại để trả về
      const result = await this._loadDistributionWithStudents(distribution.id);

      // 10. Emit socket event cho tất cả thành viên nhóm
      emitGradeDistributed(groupId, reportId, result);

      return { success: true, data: result, message: "Đã phân chia điểm thành công" };
    } catch (error) {
      await transaction.rollback();
      console.error("Distribute grade error:", error);
      return { success: false, message: "Lỗi khi phân chia điểm", error: error.message };
    }
  }

  /**
   * Thành viên phản hồi về điểm được chia
   */
  async submitMemberFeedback({ distributionId, studentId, feedback }) {
    try {
      const distribution = await GroupGradeDistribution.findByPk(distributionId);
      if (!distribution) {
        return { success: false, message: "Không tìm thấy thông tin phân chia điểm" };
      }
      if (distribution.status === "finalized") {
        return { success: false, message: "Điểm đã chốt, không thể phản hồi", code: "ALREADY_FINALIZED" };
      }

      const memberRecord = await GroupGradeMember.findOne({
        where: { distributionId, studentId },
      });
      if (!memberRecord) {
        return { success: false, message: "Bạn không có trong danh sách chia điểm này", code: "NOT_MEMBER" };
      }

      await memberRecord.update({
        memberFeedback: feedback || null,
        feedbackAt: new Date(),
        feedbackStatus: "pending",
      });

      return { success: true, message: "Đã gửi phản hồi thành công", data: memberRecord };
    } catch (error) {
      console.error("Submit member feedback error:", error);
      return { success: false, message: "Lỗi khi gửi phản hồi", error: error.message };
    }
  }

  /**
   * Instructor mở lại phân chia điểm (chỉ 1 lần, khi submittedCount < 2)
   */
  async reopenDistribution({ distributionId, instructorId, groupId }) {
    try {
      // Verify instructor quyền với lớp chứa nhóm
      const group = await Group.findByPk(groupId, { attributes: ["groupId", "classId"] });
      if (!group) return { success: false, message: "Nhóm không tìm thấy" };

      const isInstructor = await ClassInstructor.findOne({
        where: { classId: group.classId, instructorId },
      });
      if (!isInstructor) {
        return { success: false, message: "Bạn không có quyền với lớp này", code: "FORBIDDEN" };
      }

      const distribution = await GroupGradeDistribution.findByPk(distributionId);
      if (!distribution || distribution.groupId !== groupId) {
        return { success: false, message: "Không tìm thấy bản phân chia điểm" };
      }
      if (distribution.status === "finalized") {
        return { success: false, message: "Điểm đã chốt, không thể mở lại", code: "ALREADY_FINALIZED" };
      }
      if (distribution.status === "reopened") {
        return { success: false, message: "Đã mở lại rồi, chờ leader cập nhật", code: "ALREADY_REOPENED" };
      }
      if (distribution.submittedCount >= 2) {
        return {
          success: false,
          message: "Đã đạt giới hạn số lần chỉnh sửa (1 lần). Hãy chốt điểm.",
          code: "MAX_REOPEN_REACHED",
        };
      }

      await distribution.update({ status: "reopened" });

      const result = await this._loadDistributionWithStudents(distributionId);
      return { success: true, data: result, message: "Đã mở lại để leader chỉnh sửa" };
    } catch (error) {
      console.error("Reopen distribution error:", error);
      return { success: false, message: "Lỗi khi mở lại phân chia điểm", error: error.message };
    }
  }

  /**
   * Instructor chốt điểm vĩnh viễn
   */
  async finalizeDistribution({ distributionId, instructorId, groupId }) {
    try {
      const group = await Group.findByPk(groupId, { attributes: ["groupId", "classId"] });
      if (!group) return { success: false, message: "Nhóm không tìm thấy" };

      const isInstructor = await ClassInstructor.findOne({
        where: { classId: group.classId, instructorId },
      });
      if (!isInstructor) {
        return { success: false, message: "Bạn không có quyền với lớp này", code: "FORBIDDEN" };
      }

      const distribution = await GroupGradeDistribution.findByPk(distributionId);
      if (!distribution || distribution.groupId !== groupId) {
        return { success: false, message: "Không tìm thấy bản phân chia điểm" };
      }
      if (distribution.status === "finalized") {
        return { success: false, message: "Điểm đã được chốt rồi", code: "ALREADY_FINALIZED" };
      }

      await distribution.update({ status: "finalized", finalizedAt: new Date() });
      const reportId = distribution.reportId;
      const result = await this._loadDistributionWithStudents(distributionId);

      // Emit socket event cho tất cả thành viên nhóm
      emitGradeFinalized(groupId, reportId, result);

      return { success: true, data: result, message: "Đã chốt điểm thành công" };
    } catch (error) {
      console.error("Finalize distribution error:", error);
      return { success: false, message: "Lỗi khi chốt điểm", error: error.message };
    }
  }

  /**
   * Lấy thông tin phân chia điểm của 1 report
   */
  async getDistributionByReport(reportId, userId) {
    try {
      const report = await AIReport.findByPk(reportId);
      if (!report) return { success: false, message: "AI Report không tìm thấy" };

      const presentation = await Presentation.findByPk(report.presentationId);
      if (!presentation) return { success: false, message: "Presentation không tìm thấy" };

      const topicEnrollment = await db.TopicEnrollment.findOne({
        where: { topicId: presentation.topicId, status: "enrolled" },
      });
      if (!topicEnrollment?.groupId) {
        return { success: false, message: "Presentation không thuộc nhóm nào" };
      }

      const distribution = await GroupGradeDistribution.findOne({
        where: { groupId: topicEnrollment.groupId, reportId },
        include: [
          { model: GroupGradeMember, as: "members" },
          { model: Group, as: "group", attributes: ["groupId", "groupName"] },
          { model: db.User, as: "leader", attributes: ["userId", "firstName", "lastName", "email"] },
        ],
      });

      if (!distribution) {
        return { success: true, data: null, message: "Chưa có phân chia điểm cho report này" };
      }

      const memberStudentIds = distribution.members.map((m) => m.studentId);
      const students = await db.User.findAll({
        where: { userId: memberStudentIds },
        attributes: ["userId", "firstName", "lastName", "email"],
      });
      const studentMap = new Map(students.map((s) => [s.userId, s]));

      const plain = distribution.toJSON();
      return {
        success: true,
        data: {
          ...plain,
          instructorGrade: parseFloat(plain.instructorGrade),
          members: plain.members.map((m) => ({
            ...m,
            percentage: parseFloat(m.percentage),
            receivedGrade: parseFloat(m.receivedGrade),
            student: studentMap.get(m.studentId) || null,
          })),
        },
      };
    } catch (error) {
      console.error("Get distribution by report error:", error);
      return { success: false, message: "Lỗi khi lấy thông tin phân chia điểm", error: error.message };
    }
  }

  /**
   * Lấy tất cả phân chia điểm của 1 nhóm (student + instructor)
   */
  async getDistributionsByGroup(groupId, userId) {
    try {
      const membership = await GroupStudent.findOne({ where: { groupId, studentId: userId } });

      if (!membership) {
        const groupData = await Group.findByPk(groupId, { attributes: ["groupId", "classId"] });
        let isInstructor = false;
        if (groupData?.classId) {
          const instructorRecord = await ClassInstructor.findOne({
            where: { classId: groupData.classId, instructorId: userId },
          });
          isInstructor = !!instructorRecord;
        }
        if (!isInstructor) {
          return { success: false, message: "Bạn không phải thành viên của nhóm này", code: "NOT_MEMBER" };
        }
      }

      const distributions = await GroupGradeDistribution.findAll({
        where: { groupId },
        include: [
          { model: GroupGradeMember, as: "members" },
          { model: AIReport, as: "report", attributes: ["reportId", "reportStatus", "overallScore", "gradeForInstructor"] },
          { model: db.User, as: "leader", attributes: ["userId", "firstName", "lastName"] },
        ],
        order: [["distributedAt", "DESC"]],
      });

      // Enrich members với student info
      const allStudentIds = new Set();
      distributions.forEach((d) => d.members?.forEach((m) => allStudentIds.add(m.studentId)));

      let studentMap = new Map();
      if (allStudentIds.size > 0) {
        const students = await db.User.findAll({
          where: { userId: [...allStudentIds] },
          attributes: ["userId", "firstName", "lastName", "email"],
        });
        studentMap = new Map(students.map((s) => [s.userId, s]));
      }

      const enriched = distributions.map((d) => {
        const plain = d.toJSON ? d.toJSON() : d;
        return {
          ...plain,
          instructorGrade: parseFloat(plain.instructorGrade),
          members: (plain.members || []).map((m) => ({
            ...m,
            percentage: parseFloat(m.percentage),
            receivedGrade: parseFloat(m.receivedGrade),
            student: studentMap.get(m.studentId) || null,
          })),
        };
      });

      return { success: true, data: enriched };
    } catch (error) {
      console.error("Get distributions by group error:", error);
      return { success: false, message: "Lỗi khi lấy danh sách phân chia điểm", error: error.message };
    }
  }

  /**
   * Lấy tất cả phân chia điểm của tất cả nhóm trong 1 lớp (Instructor)
   */
  async getGradeDistributionsByClass(classId, instructorId) {
    try {
      const isInstructor = await ClassInstructor.findOne({
        where: { classId, instructorId },
      });
      if (!isInstructor) {
        return { success: false, message: "Bạn không phải giảng viên của lớp này", code: "FORBIDDEN" };
      }

      const groups = await Group.findAll({
        where: { classId },
        attributes: ["groupId", "groupName"],
      });

      if (groups.length === 0) {
        return { success: true, data: [], message: "Lớp này chưa có nhóm nào" };
      }

      const groupIds = groups.map((g) => g.groupId);

      const distributions = await GroupGradeDistribution.findAll({
        where: { groupId: groupIds },
        include: [
          { model: GroupGradeMember, as: "members" },
          { model: Group, as: "group", attributes: ["groupId", "groupName"] },
          { model: AIReport, as: "report", attributes: ["reportId", "reportStatus", "overallScore", "gradeForInstructor"] },
          { model: db.User, as: "leader", attributes: ["userId", "firstName", "lastName"] },
        ],
        order: [["distributedAt", "DESC"]],
      });

      const allStudentIds = new Set();
      distributions.forEach((d) => d.members?.forEach((m) => allStudentIds.add(m.studentId)));

      let studentMap = new Map();
      if (allStudentIds.size > 0) {
        const students = await db.User.findAll({
          where: { userId: [...allStudentIds] },
          attributes: ["userId", "firstName", "lastName", "email"],
        });
        studentMap = new Map(students.map((s) => [s.userId, s]));
      }

      const groupMap = new Map(groups.map((g) => [g.groupId, g]));

      const enriched = distributions.map((d) => {
        const plain = d.toJSON ? d.toJSON() : d;
        return {
          ...plain,
          instructorGrade: parseFloat(plain.instructorGrade),
          members: (plain.members || []).map((m) => ({
            ...m,
            percentage: parseFloat(m.percentage),
            receivedGrade: parseFloat(m.receivedGrade),
            student: studentMap.get(m.studentId) || null,
          })),
        };
      });

      return { success: true, data: enriched };
    } catch (error) {
      console.error("Get grade distributions by class error:", error);
      return { success: false, message: "Lỗi khi lấy danh sách phân chia điểm theo lớp", error: error.message };
    }
  }

  /**
   * Lấy điểm cá nhân của 1 thành viên trong nhóm
   */
  async getMemberGradesInGroup(groupId, studentId) {
    try {
      const membership = await GroupStudent.findOne({ where: { groupId, studentId } });
      if (!membership) {
        return { success: false, message: "Bạn không phải thành viên của nhóm này", code: "NOT_MEMBER" };
      }

      const distributions = await GroupGradeDistribution.findAll({
        where: { groupId },
        include: [
          { model: GroupGradeMember, as: "members", where: { studentId }, required: true },
          { model: AIReport, as: "report", attributes: ["reportId", "overallScore", "gradeForInstructor"] },
        ],
      });

      return { success: true, data: distributions };
    } catch (error) {
      console.error("Get member grades in group error:", error);
      return { success: false, message: "Lỗi khi lấy điểm của thành viên", error: error.message };
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  async _loadDistributionWithStudents(distributionId) {
    const dist = await GroupGradeDistribution.findByPk(distributionId, {
      include: [
        { model: GroupGradeMember, as: "members" },
        { model: Group, as: "group", attributes: ["groupId", "groupName"] },
        { model: AIReport, as: "report", attributes: ["reportId"] },
        { model: db.User, as: "leader", attributes: ["userId", "firstName", "lastName", "email"] },
      ],
    });

    if (!dist) return null;

    const memberStudentIds = dist.members.map((m) => m.studentId);
    const students = await db.User.findAll({
      where: { userId: memberStudentIds },
      attributes: ["userId", "firstName", "lastName", "email"],
    });
    const studentMap = new Map(students.map((s) => [s.userId, s]));

    const plain = dist.toJSON();
    return {
      ...plain,
      instructorGrade: parseFloat(plain.instructorGrade),
      members: plain.members.map((m) => ({
        ...m,
        percentage: parseFloat(m.percentage),
        receivedGrade: parseFloat(m.receivedGrade),
        student: studentMap.get(m.studentId) || null,
      })),
    };
  }
}

module.exports = new GroupGradeDistributionService();