"use strict";

const db = require("../models");
const { Group, GroupStudent, Class, User, Enrollment, TopicEnrollment, Topic, Course, Presentation, GroupGradeDistribution } = db;

class GroupService {
  async createGroup(classId, groupName, description, userId) {
    try {
      const enrollment = await Enrollment.findOne({
        where: { studentId: userId, classId, status: "enrolled" },
      });

      if (!enrollment) {
        return { success: false, message: "Bạn chưa đăng ký lớp này" };
      }
      const classData = await Class.findByPk(classId);
      if (!classData) {
        return { success: false, message: "Lớp học không tồn tại" };
      }

      if (classData.status !== "active") {
        return { success: false, message: "Lớp học đã đóng" };
      }
      const existingGroup = await Group.findOne({
        where: { classId, groupName },
      });

      if (existingGroup) {
        return { success: false, message: "Tên nhóm đã tồn tại trong lớp này" };
      }
      const existingMembership = await GroupStudent.findOne({
        where: { studentId: userId },
        include: [
          {
            model: Group,
            as: "group",
            where: { classId },
          },
        ],
      });

      if (existingMembership) {
        return {
          success: false,
          message: "Bạn đã thuộc một nhóm trong lớp này",
        };
      }
      const group = await Group.create({
        classId,
        groupName,
        description,
      });
      await GroupStudent.create({
        groupId: group.groupId,
        studentId: userId,
        role: "leader",
      });
      const result = await Group.findByPk(group.groupId, {
        include: [
          {
            model: User,
            as: "students",
            through: { attributes: ["role", "joinedAt"] },
            attributes: [
              "userId",
              "username",
              "firstName",
              "lastName",
              "avatar",
            ],
          },
        ],
      });

      return {
        success: true,
        message: "Tạo nhóm thành công",
        group: result,
      };
    } catch (error) {
      console.error("Create group error:", error);
      return {
        success: false,
        message: "Không thể tạo nhóm",
        error: error.message,
      };
    }
  }

  async joinGroup(groupId, userId) {
    try {
      const group = await Group.findByPk(groupId, {
        include: [{ model: Class, as: "class" }],
      });

      if (!group) {
        return { success: false, message: "Nhóm không tồn tại" };
      }

      if (group.class.status !== "active") {
        return { success: false, message: "Lớp học đã đóng" };
      }

      const enrollment = await Enrollment.findOne({
        where: {
          studentId: userId,
          classId: group.classId,
          status: "enrolled",
        },
      });

      if (!enrollment) {
        return { success: false, message: "Bạn chưa đăng ký lớp này" };
      }
      const existingMembership = await GroupStudent.findOne({
        where: { studentId: userId },
        include: [
          {
            model: Group,
            as: "group",
            where: { classId: group.classId },
          },
        ],
      });

      if (existingMembership) {
        return {
          success: false,
          message: "Bạn đã thuộc một nhóm trong lớp này",
        };
      }

      // Kiểm tra số lượng thành viên với maxGroupMembers
      const memberCount = await GroupStudent.count({
        where: { groupId },
      });

      if (group.class.maxGroupMembers && memberCount >= group.class.maxGroupMembers) {
        return {
          success: false,
          message: `Nhóm đã đủ số thành viên tối đa (${group.class.maxGroupMembers} người)`,
        };
      }

      // Vấn đề 2: Chặn join nếu nhóm đã có bài thuyết trình
      // Kiểm tra presentation nào đã được nộp (submitted/processing/done/failed)
      // Nếu chỉ là draft thì vẫn cho join
      const existingPresentation = await Presentation.findOne({
        where: {
          groupCode: groupId.toString(),
          status: { [db.Sequelize.Op.notIn]: ["draft"] },
        },
      });

      if (existingPresentation) {
        return {
          success: false,
          message: "Không thể tham gia nhóm vì nhóm đã có bài thuyết trình được nộp trên hệ thống.",
        };
      }

      // Vấn đề 1 (bổ sung): Chặn join nếu điểm đã được chốt
      const finalizedDistribution = await GroupGradeDistribution.findOne({
        where: { groupId, status: "finalized" },
      });

      if (finalizedDistribution) {
        return {
          success: false,
          message: "Không thể tham gia nhóm vì điểm đã được chốt bởi giảng viên.",
        };
      }

      await GroupStudent.create({
        groupId: group.groupId,
        studentId: userId,
        role: "member",
      });
      const user = await User.findByPk(userId, {
        attributes: ["userId", "username", "firstName", "lastName", "avatar"],
      });

      return {
        success: true,
        message: "Tham gia nhóm thành công",
        student: user,
        memberCount: memberCount + 1,
        maxGroupMembers: group.class.maxGroupMembers,
      };
    } catch (error) {
      console.error("Join group error:", error);
      return {
        success: false,
        message: "Không thể tham gia nhóm",
        error: error.message,
      };
    }
  }

  async leaveGroup(groupId, userId) {
    try {
      const membership = await GroupStudent.findOne({
        where: { groupId, studentId: userId },
      });

      if (!membership) {
        return { success: false, message: "Bạn không trong nhóm này" };
      }
      if (membership.role === "leader") {
        return {
          success: false,
          message:
            "Bạn là trưởng nhóm. Vui lòng chuyển quyền trưởng nhóm hoặc giải thể nhóm trước khi rời đi",
        };
      }

      // Vấn đề 1: Chặn rời nhóm nếu điểm đã được chốt
      const finalizedDistribution = await GroupGradeDistribution.findOne({
        where: { groupId, status: "finalized" },
      });

      if (finalizedDistribution) {
        const finalizedDate = finalizedDistribution.finalizedAt
          ? new Date(finalizedDistribution.finalizedAt).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "trước đó";
        return {
          success: false,
          message: `Không thể rời nhóm vì điểm đã được chốt vào ngày ${finalizedDate}. Vui lòng liên hệ giảng viên nếu cần hỗ trợ.`,
        };
      }

      // Cũng chặn nếu nhóm đang có distribution đang xử lý (submitted/reopened)
      // để tránh rời nhóm giữa chừng
      const activeDistribution = await GroupGradeDistribution.findOne({
        where: {
          groupId,
          status: { [db.Sequelize.Op.in]: ["submitted", "reopened"] },
        },
      });

      if (activeDistribution) {
        return {
          success: false,
          message:
            "Không thể rời nhóm vì đang có phân chia điểm đang xử lý. Vui lòng chờ hoàn tất.",
        };
      }

      await membership.destroy();

      return { success: true, message: "Rời nhóm thành công" };
    } catch (error) {
      console.error("Leave group error:", error);
      return {
        success: false,
        message: "Không thể rời nhóm",
        error: error.message,
      };
    }
  }

  async removeMember(groupId, studentId, userId) {
    try {
      const leaderMembership = await GroupStudent.findOne({
        where: { groupId, studentId: userId },
      });

      if (!leaderMembership || leaderMembership.role !== "leader") {
        return {
          success: false,
          message: "Chỉ trưởng nhóm mới có quyền xóa thành viên",
        };
      }
      const memberToRemove = await GroupStudent.findOne({
        where: { groupId, studentId },
      });

      if (!memberToRemove) {
        return {
          success: false,
          message: "Thành viên không tồn tại trong nhóm",
        };
      }
      if (memberToRemove.role === "leader") {
        return { success: false, message: "Không thể xóa trưởng nhóm" };
      }
      await memberToRemove.destroy();

      return { success: true, message: "Đã xóa thành viên khỏi nhóm" };
    } catch (error) {
      console.error("Remove member error:", error);
      return {
        success: false,
        message: "Không thể xóa thành viên",
        error: error.message,
      };
    }
  }

  async promoteMember(groupId, studentId, userId) {
    try {
      // Find the existing leader of the group
      const existingLeader = await GroupStudent.findOne({
        where: { groupId, role: "leader" },
      });

      // Find the member to be promoted
      const memberToPromote = await GroupStudent.findOne({
        where: { groupId, studentId },
      });

      if (!memberToPromote) {
        return {
          success: false,
          message: "Thành viên này không tồn tại trong nhóm",
        };
      }

      if (memberToPromote.role === "leader") {
        return {
          success: false,
          message: "Thành viên này đã là trưởng nhóm rồi",
        };
      }

      const transaction = await db.sequelize.transaction();
      try {
        // 1. Demote existing leader if exists
        if (existingLeader) {
          await existingLeader.update({ role: "member" }, { transaction });
        }

        // 2. Promote new leader
        await memberToPromote.update({ role: "leader" }, { transaction });

        await transaction.commit();

        return {
          success: true,
          message: `Đã chuyển quyền trưởng nhóm sang cho sinh viên ID ${studentId}`,
          newLeaderId: studentId,
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Promote member error:", error);
      return {
        success: false,
        message: "Không thể chuyển quyền trưởng nhóm",
        error: error.message,
      };
    }
  }

  async updateGroup(groupId, updateData, userId) {
    try {
      const { groupName, description } = updateData;
      const leader = await GroupStudent.findOne({
        where: { groupId, studentId: userId, role: "leader" },
      });

      if (!leader) {
        return {
          success: false,
          message: "Chỉ trưởng nhóm mới có quyền cập nhật",
        };
      }
      const group = await Group.findByPk(groupId);
      if (!group) {
        return { success: false, message: "Nhóm không tồn tại" };
      }
      if (groupName && groupName !== group.groupName) {
        const existing = await Group.findOne({
          where: { classId: group.classId, groupName },
        });

        if (existing) {
          return {
            success: false,
            message: "Tên nhóm đã tồn tại trong lớp này",
          };
        }
      }
      if (groupName) group.groupName = groupName;
      if (description !== undefined) group.description = description;
      await group.save();

      return {
        success: true,
        message: "Cập nhật nhóm thành công",
        group,
      };
    } catch (error) {
      console.error("Update group error:", error);
      return {
        success: false,
        message: "Không thể cập nhật nhóm",
        error: error.message,
      };
    }
  }

  async deleteGroup(groupId, userId) {
    try {
      const leader = await GroupStudent.findOne({
        where: { groupId, studentId: userId, role: "leader" },
      });

      if (!leader) {
        return {
          success: false,
          message: "Chỉ trưởng nhóm mới có quyền giải thể nhóm",
        };
      }
      await Group.destroy({ where: { groupId } });

      return { success: true, message: "Đã giải thể nhóm" };
    } catch (error) {
      console.error("Delete group error:", error);
      return {
        success: false,
        message: "Không thể giải thể nhóm",
        error: error.message,
      };
    }
  }

  async getGroupsByClass(classId, userId) {
    try {
      const enrollment = await Enrollment.findOne({
        where: { studentId: userId, classId, status: "enrolled" },
      });
      const groups = await Group.findAll({
        where: { classId },
        include: [
          {
            model: User,
            as: "students",
            through: { attributes: ["role", "joinedAt"] },
            attributes: [
              "userId",
              "username",
              "firstName",
              "lastName",
              "avatar",
            ],
          },
        ],
        order: [["groupName", "ASC"]],
      });
      const result = groups.map((group) => {
        const myMembership = group.students.find((s) => s.userId === userId);
        return {
          ...group.toJSON(),
          isMember: !!myMembership,
          myRole: myMembership?.GroupStudent?.role || null,
          memberCount: group.students.length,
        };
      });
      const classData = await Class.findByPk(classId, {
        attributes: ["classId", "classCode", "maxGroupMembers"],
      });

      return {
        success: true,
        data: {
          class: classData,
          groups: result,
          isEnrolled: !!enrollment,
        },
      };
    } catch (error) {
      console.error("Get groups error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách nhóm",
        error: error.message,
      };
    }
  }

  async getGroupById(groupId, userId) {
    try {
      const group = await Group.findByPk(groupId, {
        include: [
          {
            model: Class,
            as: "class",
            attributes: ["classId", "classCode"],
          },
          {
            model: User,
            as: "students",
            through: { attributes: ["role", "joinedAt"] },
            attributes: [
              "userId",
              "username",
              "firstName",
              "lastName",
              "avatar",
            ],
          },
        ],
      });

      if (!group) {
        return { success: false, message: "Nhóm không tồn tại" };
      }

      const myMembership = group.students.find((s) => s.userId === userId);

      return {
        success: true,
        data: {
          ...group.toJSON(),
          isMember: !!myMembership,
          myRole: myMembership?.GroupStudent?.role || null,
          memberCount: group.students.length,
          maxGroupMembers: group.class.maxGroupMembers,
        },
      };
    } catch (error) {
      console.error("Get group error:", error);
      return {
        success: false,
        message: "Không thể lấy thông tin nhóm",
        error: error.message,
      };
    }
  }

  async getMyGroupInClass(classId, userId) {
    try {
      // Tìm membership của user trong class này
      const myMembership = await GroupStudent.findOne({
        where: { studentId: userId },
        include: [
          {
            model: Group,
            as: "group",
            where: { classId },
            include: [
              {
                model: Class,
                as: "class",
                attributes: ["classId", "classCode", "maxGroupMembers"],
              },
            ],
          },
        ],
      });

      if (!myMembership) {
        return {
          success: true,
          data: null,
          message: "Bạn chưa thuộc nhóm nào trong lớp này",
        };
      }

      const group = myMembership.group;
      
      // Đếm số thành viên
      const memberCount = await GroupStudent.count({
        where: { groupId: group.groupId },
      });

      return {
        success: true,
        data: {
          groupId: group.groupId,
          classId: group.classId,
          groupName: group.groupName,
          description: group.description,
          class: group.class,
          myRole: myMembership.role,
          memberCount: memberCount,
          maxGroupMembers: group.class.maxGroupMembers,
        },
      };
    } catch (error) {
      console.error("Get my group in class error:", error);
      return {
        success: false,
        message: "Không thể lấy thông tin nhóm của bạn",
        error: error.message,
      };
    }
  }

  async getMyGroups(userId) {
    try {
      // 1. Get group IDs that user is in
      const myMemberships = await GroupStudent.findAll({
        where: { studentId: userId },
        attributes: ["groupId"],
      });

      const groupIds = myMemberships.map((m) => m.groupId);

      if (groupIds.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // 2. Get groups with ALL members
      const groups = await Group.findAll({
        where: {
          groupId: groupIds,
        },
        include: [
          {
            model: User,
            as: "students",
            through: { attributes: ["role", "joinedAt"] },
            attributes: [
              "userId",
              "username",
              "firstName",
              "lastName",
              "avatar",
            ],
          },
          {
            model: Class,
            as: "class",
            attributes: ["classId", "classCode", "courseId"],
          },
        ],
      });

      return {
        success: true,
        data: groups.map((g) => {
          const myMembership = g.students.find((s) => s.userId === userId);
          return {
            ...g.toJSON(),
            myRole: myMembership?.GroupStudent?.role || null,
            memberCount: g.students.length,
          };
        }),
      };
    } catch (error) {
      console.error("Get my groups error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách nhóm của bạn",
        error: error.message,
      };
    }
  }

  // ============================================================
  // TOPIC SELECTION — nhóm trưởng chọn topic cho cả nhóm
  // ============================================================

  /**
   * Nhóm trưởng chọn topic cho nhóm.
   * Tự động enroll tất cả thành viên trong nhóm vào topic đó.
   * Nếu nhóm đã chọn topic khác → xóa enrollment cũ (nếu chưa có presentation).
   */
  async selectGroupTopic(groupId, topicId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      // 1. Verify caller is leader
      const leaderMembership = await GroupStudent.findOne({
        where: { groupId, studentId: userId },
        transaction,
      });

      if (!leaderMembership) {
        await transaction.rollback();
        return { success: false, message: "Bạn không thuộc nhóm này" };
      }

      if (leaderMembership.role !== "leader") {
        await transaction.rollback();
        return {
          success: false,
          message: "Chỉ trưởng nhóm mới có quyền chọn topic",
        };
      }

      // 2. Get group → class → courseId
      const group = await Group.findByPk(groupId, {
        include: [{ model: Class, as: "class", attributes: ["classId", "courseId", "status"] }],
        transaction,
      });

      if (!group) {
        await transaction.rollback();
        return { success: false, message: "Nhóm không tồn tại" };
      }

      if (group.class.status !== "active") {
        await transaction.rollback();
        return { success: false, message: "Lớp học đã đóng" };
      }

      const courseId = group.class.courseId;

      // 3. Verify topic belongs to this class directly
      const topic = await Topic.findByPk(topicId, { transaction });

      if (!topic) {
        await transaction.rollback();
        return { success: false, message: "Topic không tồn tại" };
      }

      if (topic.classId !== group.classId) {
        await transaction.rollback();
        return {
          success: false,
          message: "Topic không thuộc lớp học này",
        };
      }

      // 4. Check if group already has an active topic enrollment in this class
      const existingEnrollment = await TopicEnrollment.findOne({
        where: { groupId, status: "enrolled" },
        include: [
          {
            model: Topic,
            as: "topic",
            where: { classId: group.classId },
            attributes: ["topicId", "topicName"],
          },
        ],
        transaction,
      });

      if (existingEnrollment) {
        if (existingEnrollment.topicId === topicId) {
          await transaction.rollback();
          return {
            success: false,
            message: "Nhóm đã chọn topic này rồi",
          };
        }

        // Check if any presentations exist for this group on the old topic
        const presentationCount = await Presentation.count({
          where: { topicId: existingEnrollment.topicId, groupCode: groupId.toString() },
          transaction,
        });

        // Also check if any member has a presentation on that topic
        const memberIds = await GroupStudent.findAll({
          where: { groupId },
          attributes: ["studentId"],
          transaction,
        });
        const memberStudentIds = memberIds.map((m) => m.studentId);

        const memberPresentationCount = await Presentation.count({
          where: {
            topicId: existingEnrollment.topicId,
            studentId: memberStudentIds,
          },
          transaction,
        });

        if (presentationCount > 0 || memberPresentationCount > 0) {
          await transaction.rollback();
          return {
            success: false,
            message: "Không thể đổi topic vì nhóm đã có bài thuyết trình trên topic hiện tại",
          };
        }

        // Drop all existing enrollment records for this group
        await TopicEnrollment.update(
          { status: "dropped" },
          { where: { groupId, status: "enrolled" }, transaction }
        );
      }

      // 5. Get all group members
      const members = await GroupStudent.findAll({
        where: { groupId },
        attributes: ["studentId"],
        transaction,
      });

      if (members.length === 0) {
        await transaction.rollback();
        return { success: false, message: "Nhóm không có thành viên" };
      }

      // 6. Bulk-enroll all members into the topic
      const enrollments = members.map((m) => ({
        studentId: m.studentId,
        topicId,
        groupId,
        status: "enrolled",
        enrolledAt: new Date(),
      }));

      await TopicEnrollment.bulkCreate(enrollments, {
        transaction,
        updateOnDuplicate: ['status', 'groupId', 'enrolledAt'],
      });

      await transaction.commit();

      return {
        success: true,
        message: `Đã chọn topic "${topic.topicName}" cho nhóm. ${members.length} thành viên đã được enroll.`,
        data: {
          groupId,
          topicId,
          topicName: topic.topicName,
          enrolledCount: members.length,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Select group topic error:", error);
      return {
        success: false,
        message: "Không thể chọn topic cho nhóm",
        error: error.message,
      };
    }
  }

  /**
   * Lấy topic hiện tại của nhóm (nếu có)
   */
  async getGroupTopic(groupId, userId) {
    try {
      // Verify user belongs to group
      const membership = await GroupStudent.findOne({
        where: { groupId, studentId: userId },
      });

      if (!membership) {
        return { success: false, message: "Bạn không thuộc nhóm này" };
      }

      const group = await Group.findByPk(groupId, {
        include: [{ model: Class, as: "class", attributes: ["classId", "courseId"] }],
      });

      if (!group) {
        return { success: false, message: "Nhóm không tồn tại" };
      }

      const courseId = group.class.courseId;

      // Find active enrollment for this group (any topic in this class)
      const enrollment = await TopicEnrollment.findOne({
        where: { groupId, status: "enrolled" },
        include: [
          {
            model: Topic,
            as: "topic",
            where: { classId: group.classId },
            attributes: ["topicId", "topicName", "description", "dueDate", "sequenceNumber"],
          },
        ],
      });

      if (!enrollment) {
        return {
          success: true,
          data: null,
          message: "Nhóm chưa chọn topic nào",
        };
      }

      return {
        success: true,
        data: {
          topicId: enrollment.topic.topicId,
          topicName: enrollment.topic.topicName,
          description: enrollment.topic.description,
          dueDate: enrollment.topic.dueDate,
          sequenceNumber: enrollment.topic.sequenceNumber,
          enrolledAt: enrollment.enrolledAt,
        },
      };
    } catch (error) {
      console.error("Get group topic error:", error);
      return {
        success: false,
        message: "Không thể lấy thông tin topic của nhóm",
        error: error.message,
      };
    }
  }

  /**
   * Huỷ chọn topic của nhóm (leader only, chặn nếu đã có presentation)
   */
  async removeGroupTopic(groupId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      // Verify leader
      const leaderMembership = await GroupStudent.findOne({
        where: { groupId, studentId: userId },
        transaction,
      });

      if (!leaderMembership) {
        await transaction.rollback();
        return { success: false, message: "Bạn không thuộc nhóm này" };
      }

      if (leaderMembership.role !== "leader") {
        await transaction.rollback();
        return {
          success: false,
          message: "Chỉ trưởng nhóm mới có quyền huỷ topic",
        };
      }

      // Find current topic enrollment
      const existingEnrollment = await TopicEnrollment.findOne({
        where: { groupId, status: "enrolled" },
        transaction,
      });

      if (!existingEnrollment) {
        await transaction.rollback();
        return { success: false, message: "Nhóm chưa chọn topic nào" };
      }

      // Check if any member has a presentation on this topic
      const members = await GroupStudent.findAll({
        where: { groupId },
        attributes: ["studentId"],
        transaction,
      });
      const memberStudentIds = members.map((m) => m.studentId);

      const presentationCount = await Presentation.count({
        where: {
          topicId: existingEnrollment.topicId,
          studentId: memberStudentIds,
        },
        transaction,
      });

      if (presentationCount > 0) {
        await transaction.rollback();
        return {
          success: false,
          message: "Không thể huỷ topic vì nhóm đã có bài thuyết trình",
        };
      }

      // Drop all enrollments for this group
      await TopicEnrollment.update(
        { status: "dropped" },
        { where: { groupId, status: "enrolled" }, transaction }
      );

      await transaction.commit();

      return { success: true, message: "Đã huỷ chọn topic cho nhóm" };
    } catch (error) {
      await transaction.rollback();
      console.error("Remove group topic error:", error);
      return {
        success: false,
        message: "Không thể huỷ topic",
        error: error.message,
      };
    }
  }
  /**
   * Tự động phân nhóm sinh viên đã enroll vào lớp (Instructor/Admin only)
   * @param {number} classId
   * @param {object} options
   *   strategy: 'groupCount' | 'membersPerGroup'
   *   value: number — số nhóm hoặc số thành viên/nhóm
   *   namePrefix: string — tiền tố tên nhóm, VD "Nhóm" → Nhóm 1, Nhóm 2...
   *   resetExisting: boolean — xoá tất cả nhóm cũ trước khi phân; false = chỉ phân sv chưa có nhóm
   * @param {number} userId
   * @param {string} userRole
   */
  async autoAssignGroups(classId, options, userId, userRole) {
    const { strategy, value, namePrefix = "Nhóm", resetExisting = false } = options;

    if (!["groupCount", "membersPerGroup"].includes(strategy)) {
      return { success: false, message: "Chiến lược không hợp lệ. Dùng 'groupCount' hoặc 'membersPerGroup'" };
    }
    if (!value || value < 1 || value > 200) {
      return { success: false, message: "Giá trị không hợp lệ (1-200)" };
    }

    const transaction = await db.sequelize.transaction();
    try {
      // 1. Verify class exists
      const classData = await Class.findByPk(classId, { transaction });
      if (!classData) {
        await transaction.rollback();
        return { success: false, message: "Không tìm thấy lớp học" };
      }

      // 2. Get all enrolled students
      const enrollments = await Enrollment.findAll({
        where: { classId, status: "enrolled" },
        attributes: ["studentId"],
        transaction,
      });

      if (enrollments.length === 0) {
        await transaction.rollback();
        return { success: false, message: "Lớp học chưa có sinh viên đăng ký" };
      }

      const allStudentIds = enrollments.map((e) => e.studentId);

      // 3. Handle existing groups
      if (resetExisting) {
        // Delete all existing groups in this class (cascade deletes GroupStudents)
        await Group.destroy({ where: { classId }, transaction });
      }

      // 4. Find students already in a group (after possible reset)
      const existingMemberships = await GroupStudent.findAll({
        include: [{ model: Group, as: "group", where: { classId }, attributes: ["groupId"] }],
        attributes: ["studentId"],
        transaction,
      });
      const alreadyGroupedIds = new Set(existingMemberships.map((m) => m.studentId));

      const unassignedIds = allStudentIds.filter((id) => !alreadyGroupedIds.has(id));

      if (unassignedIds.length === 0) {
        await transaction.rollback();
        return {
          success: false,
          message: resetExisting
            ? "Không có sinh viên nào để phân nhóm"
            : "Tất cả sinh viên đã được phân nhóm rồi. Bật 'Đặt lại tất cả' để phân lại.",
        };
      }

      // 5. Shuffle randomly (Fisher-Yates)
      const students = [...unassignedIds];
      for (let i = students.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [students[i], students[j]] = [students[j], students[i]];
      }

      // 6. Determine group count
      let groupCount;
      if (strategy === "groupCount") {
        groupCount = Math.min(value, students.length);
      } else {
        // membersPerGroup
        groupCount = Math.ceil(students.length / value);
      }

      // 7. Determine name offset (to avoid conflicts with existing group names)
      const existingGroups = await Group.findAll({
        where: { classId },
        attributes: ["groupName"],
        transaction,
      });
      // Find highest existing group number using namePrefix
      let nameOffset = 0;
      for (const g of existingGroups) {
        const match = g.groupName.match(new RegExp(`^${namePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(\\d+)$`));
        if (match) {
          nameOffset = Math.max(nameOffset, parseInt(match[1], 10));
        }
      }

      // 8. Distribute students round-robin into groups
      const groupBuckets = Array.from({ length: groupCount }, () => []);
      for (let i = 0; i < students.length; i++) {
        groupBuckets[i % groupCount].push(students[i]);
      }

      // 9. Create groups and assign students
      const createdGroups = [];
      for (let i = 0; i < groupCount; i++) {
        const bucket = groupBuckets[i];
        if (bucket.length === 0) continue;

        const groupName = `${namePrefix} ${nameOffset + i + 1}`;

        const group = await Group.create(
          { classId, groupName, description: null },
          { transaction }
        );

        const memberRecords = bucket.map((studentId, idx) => ({
          groupId: group.groupId,
          studentId,
          role: idx === 0 ? "leader" : "member",
          joinedAt: new Date(),
        }));

        await GroupStudent.bulkCreate(memberRecords, { transaction });

        createdGroups.push({
          groupId: group.groupId,
          groupName,
          memberCount: bucket.length,
          leaderId: bucket[0],
        });
      }

      await transaction.commit();

      return {
        success: true,
        message: `Đã phân ${students.length} sinh viên vào ${createdGroups.length} nhóm thành công`,
        data: {
          totalAssigned: students.length,
          groupsCreated: createdGroups.length,
          groups: createdGroups,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Auto-assign groups error:", error);
      return {
        success: false,
        message: "Không thể phân nhóm tự động",
        error: error.message,
      };
    }
  }
}

module.exports = new GroupService();
