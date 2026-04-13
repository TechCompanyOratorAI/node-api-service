"use strict";

const db = require("../models");
const { GroupGradeDistribution, GroupGradeMember, AIReport, Presentation, GroupStudent, Group, Enrollment } = db;

class GroupGradeDistributionService {
  /**
   * Tạo mới hoặc cập nhật phân chia điểm cho các thành viên nhóm
   * Chỉ leader mới được phép thực hiện
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

      // 2. Lấy presentation để biết topicId, classId
      const presentation = await Presentation.findByPk(report.presentationId);
      if (!presentation) {
        await transaction.rollback();
        return { success: false, message: "Presentation không tìm thấy" };
      }

      // 3. Tìm TopicEnrollment để lấy groupId
      const { TopicEnrollment } = db;
      const topicEnrollment = await TopicEnrollment.findOne({
        where: {
          topicId: presentation.topicId,
          classId: presentation.classId,
          status: "enrolled",
        },
      });

      if (!topicEnrollment || !topicEnrollment.groupId) {
        await transaction.rollback();
        return {
          success: false,
          message: "Presentation không thuộc nhóm nào, không thể chia điểm theo nhóm",
          code: "NOT_GROUP_TOPIC",
        };
      }

      const groupId = topicEnrollment.groupId;

      // 4. Validate leader là leader thật sự của nhóm
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

      // 5. Validate tất cả studentId trong members đều thuộc nhóm
      const groupStudents = await GroupStudent.findAll({
        where: { groupId },
        attributes: ["studentId"],
      });
      const groupStudentIds = groupStudents.map((gs) => gs.studentId);

      for (const member of members) {
        if (!groupStudentIds.includes(member.studentId)) {
          await transaction.rollback();
          return {
            success: false,
            message: `Sinh viên ID ${member.studentId} không thuộc nhóm này`,
            code: "INVALID_MEMBER",
          };
        }
        if (
          member.percentage === undefined ||
          member.percentage === null ||
          isNaN(Number(member.percentage))
        ) {
          await transaction.rollback();
          return {
            success: false,
            message: `Phần trăm của sinh viên ID ${member.studentId} không hợp lệ`,
            code: "INVALID_PERCENTAGE",
          };
        }
        if (member.percentage < 0 || member.percentage > 100) {
          await transaction.rollback();
          return {
            success: false,
            message: `Phần trăm của sinh viên ID ${member.studentId} phải từ 0 đến 100`,
            code: "INVALID_PERCENTAGE_RANGE",
          };
        }
      }

      // 6. Kiểm tra trùng studentId trong members
      const seenStudentIds = new Set();
      for (const member of members) {
        if (seenStudentIds.has(member.studentId)) {
          await transaction.rollback();
          return {
            success: false,
            message: `Sinh viên ID ${member.studentId} xuất hiện nhiều hơn 1 lần trong danh sách chia điểm`,
            code: "DUPLICATE_MEMBER",
          };
        }
        seenStudentIds.add(member.studentId);
      }

      const instructorGrade = parseFloat(report.gradeForInstructor) || parseFloat(report.overallScore);

      // 7. Xóa distribution cũ nếu có (update or create)
      let distribution = await GroupGradeDistribution.findOne({
        where: { groupId, reportId },
      });

      if (distribution) {
        // Xóa members cũ trước
        await GroupGradeMember.destroy({
          where: { distributionId: distribution.id },
          transaction,
        });
        // Update distribution
        await distribution.update(
          {
            leaderStudentId,
            instructorGrade,
            reason,
            distributedAt: new Date(),
          },
          { transaction }
        );
      } else {
        // Tạo mới distribution
        distribution = await GroupGradeDistribution.create(
          {
            groupId,
            reportId,
            leaderStudentId,
            instructorGrade,
            reason,
            distributedAt: new Date(),
          },
          { transaction }
        );
      }

      // 8. Tạo GroupGradeMember cho từng thành viên
      const gradeMembers = members.map((member) => {
        const percentage = parseFloat(member.percentage);
        const receivedGrade = parseFloat(
          (instructorGrade * percentage / 100).toFixed(2)
        );
        return {
          distributionId: distribution.id,
          studentId: member.studentId,
          percentage,
          receivedGrade,
          reason: member.reason || null,
        };
      });

      await GroupGradeMember.bulkCreate(gradeMembers, { transaction });

      // 9. Cập nhật Enrollment.finalGrade cho từng thành viên
      for (const member of gradeMembers) {
        await Enrollment.update(
          { finalGrade: member.receivedGrade },
          {
            where: { studentId: member.studentId, classId: presentation.classId },
            transaction,
          }
        );
      }

      await transaction.commit();

      // 10. Load lại distribution với members để trả về
      const result = await GroupGradeDistribution.findByPk(distribution.id, {
        include: [
          { model: GroupGradeMember, as: "members" },
          { model: Group, as: "group", attributes: ["groupId", "groupName"] },
          { model: AIReport, as: "report", attributes: ["reportId"] },
          {
            model: db.User,
            as: "leader",
            attributes: ["userId", "firstName", "lastName", "email"],
          },
        ],
      });

      return {
        success: true,
        data: result,
        message: "Đã phân chia điểm thành công",
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Distribute grade error:", error);
      return {
        success: false,
        message: "Lỗi khi phân chia điểm",
        error: error.message,
      };
    }
  }

  /**
   * Lấy thông tin phân chia điểm của 1 report
   */
  async getDistributionByReport(reportId, userId) {
    try {
      const report = await AIReport.findByPk(reportId);
      if (!report) {
        return { success: false, message: "AI Report không tìm thấy" };
      }

      const presentation = await Presentation.findByPk(report.presentationId);
      if (!presentation) {
        return { success: false, message: "Presentation không tìm thấy" };
      }

      const { TopicEnrollment } = db;
      const topicEnrollment = await TopicEnrollment.findOne({
        where: {
          topicId: presentation.topicId,
          classId: presentation.classId,
          status: "enrolled",
        },
      });

      if (!topicEnrollment || !topicEnrollment.groupId) {
        return { success: false, message: "Presentation không thuộc nhóm nào" };
      }

      const distribution = await GroupGradeDistribution.findOne({
        where: { groupId: topicEnrollment.groupId, reportId },
        include: [
          { model: GroupGradeMember, as: "members" },
          { model: Group, as: "group", attributes: ["groupId", "groupName"] },
          {
            model: db.User,
            as: "leader",
            attributes: ["userId", "firstName", "lastName", "email"],
          },
        ],
      });

      if (!distribution) {
        return {
          success: true,
          data: null,
          message: "Chưa có phân chia điểm cho report này",
        };
      }

      // Load student info cho từng member
      const memberStudentIds = distribution.members.map((m) => m.studentId);
      const students = await db.User.findAll({
        where: { userId: memberStudentIds },
        attributes: ["userId", "firstName", "lastName", "email"],
      });
      const studentMap = new Map(students.map((s) => [s.userId, s]));

      const membersWithStudentInfo = distribution.members.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        percentage: parseFloat(m.percentage),
        receivedGrade: parseFloat(m.receivedGrade),
        reason: m.reason,
        student: studentMap.get(m.studentId),
      }));

      return {
        success: true,
        data: {
          id: distribution.id,
          groupId: distribution.groupId,
          reportId: distribution.reportId,
          instructorGrade: parseFloat(distribution.instructorGrade),
          reason: distribution.reason,
          distributedAt: distribution.distributedAt,
          group: distribution.group,
          leader: distribution.leader,
          members: membersWithStudentInfo,
        },
      };
    } catch (error) {
      console.error("Get distribution by report error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy thông tin phân chia điểm",
        error: error.message,
      };
    }
  }

  /**
   * Lấy tất cả phân chia điểm của 1 nhóm
   */
  async getDistributionsByGroup(groupId, userId) {
    try {
      // Validate user là thành viên nhóm hoặc instructor
      const membership = await GroupStudent.findOne({
        where: { groupId, studentId: userId },
      });

      if (!membership) {
        return {
          success: false,
          message: "Bạn không phải thành viên của nhóm này",
          code: "NOT_MEMBER",
        };
      }

      const distributions = await GroupGradeDistribution.findAll({
        where: { groupId },
        include: [
          { model: GroupGradeMember, as: "members" },
          {
            model: AIReport,
            as: "report",
            attributes: ["reportId", "reportStatus", "overallScore", "gradeForInstructor"],
          },
          {
            model: db.User,
            as: "leader",
            attributes: ["userId", "firstName", "lastName"],
          },
        ],
        order: [["distributedAt", "DESC"]],
      });

      return {
        success: true,
        data: distributions,
      };
    } catch (error) {
      console.error("Get distributions by group error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách phân chia điểm",
        error: error.message,
      };
    }
  }

  /**
   * Lấy điểm cá nhân của 1 thành viên trong nhóm
   */
  async getMemberGradesInGroup(groupId, studentId) {
    try {
      // Validate user là thành viên nhóm
      const membership = await GroupStudent.findOne({
        where: { groupId, studentId },
      });

      if (!membership) {
        return {
          success: false,
          message: "Bạn không phải thành viên của nhóm này",
          code: "NOT_MEMBER",
        };
      }

      // Lấy tất cả distributions của nhóm
      const distributions = await GroupGradeDistribution.findAll({
        where: { groupId },
        include: [
          {
            model: GroupGradeMember,
            as: "members",
            where: { studentId },
            required: true,
          },
          {
            model: AIReport,
            as: "report",
            attributes: ["reportId", "overallScore", "gradeForInstructor"],
          },
        ],
      });

      return {
        success: true,
        data: distributions,
      };
    } catch (error) {
      console.error("Get member grades in group error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy điểm của thành viên",
        error: error.message,
      };
    }
  }
}

export default new GroupGradeDistributionService();