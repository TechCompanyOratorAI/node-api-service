"use strict";

const db = require("../models");
const { Group, GroupStudent, Class, User, Enrollment } = db;

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

      const memberCount = await GroupStudent.count({
        where: { groupId },
      });
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
      const currentLeader = await GroupStudent.findOne({
        where: { groupId, studentId: userId },
      });

      if (!currentLeader || currentLeader.role !== "leader") {
        return {
          success: false,
          message: "Chỉ trưởng nhóm mới có quyền chuyển quyền",
        };
      }

      const member = await GroupStudent.findOne({
        where: { groupId, studentId },
      });

      if (!member) {
        return {
          success: false,
          message: "Thành viên không tồn tại trong nhóm",
        };
      }
      await currentLeader.update({ role: "member" });
      await member.update({ role: "leader" });

      return {
        success: true,
        message: "Đã chuyển quyền trưởng nhóm",
        newLeaderId: studentId,
      };
    } catch (error) {
      console.error("Promote member error:", error);
      return {
        success: false,
        message: "Không thể chuyển quyền",
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
        attributes: ["classId", "classCode"],
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

  async getMyGroups(userId) {
    try {
      const groups = await Group.findAll({
        include: [
          {
            model: User,
            as: "students",
            where: { userId },
            through: { attributes: ["role", "joinedAt"] },
            required: true,
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
        data: groups.map((g) => ({
          ...g.toJSON(),
          memberCount: g.students.length,
        })),
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
}

module.exports = new GroupService();
