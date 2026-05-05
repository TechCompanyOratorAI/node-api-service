/**
 * Centralized WebSocket emitter for the presentation processing pipeline.
 *
 * Import this module from services/controllers instead of importing
 * websocket/index.js directly to avoid circular dependencies.
 *
 * Naming convention:
 *   Job events     → room: "presentation:{id}", event: "presentation:job:{sub}"
 *   Report events  → room: "presentation:{id}", event: "report:{sub}"
 *   Permission     → room: "class:{id}",       event: "class:upload-permission-changed"
 */

import { getIO } from "../websocket/index.js";
import db from "../models/index.js";
import {
  saveForPresentation,
  saveForGroup,
  saveForClass,
  saveForUser,
  saveForClassInstructors,
  saveForPresentationInstructors,
} from "../services/notificationService.js";

const { Enrollment, ClassInstructor, Presentation, Group, GroupStudent } = db;

const withTimestamp = (payload = {}) => ({
  ...payload,
  _ts: Date.now(),
});

const emitToRoom = (room, event, payload = {}) => {
  try {
    const io = getIO();
    io.to(room).emit(event, withTimestamp(payload));
  } catch (err) {
    console.error(`[SocketEmitter] Failed to emit ${event} to room ${room}: ${err.message}`);
  }
};

const emitToUsers = (userIds = [], event, payload = {}) => {
  [...new Set(userIds.filter(Boolean))].forEach((userId) => {
    emitUserScopedEvent(userId, event, payload);
  });
};

const emitToInstructors = (userIds = [], event, payload = {}) => {
  [...new Set(userIds.filter(Boolean))].forEach((userId) => {
    emitInstructorScopedEvent(userId, event, payload);
  });
};

const getClassStudentIds = async (classId) => {
  if (!classId) return [];
  const enrollments = await Enrollment.findAll({
    where: { classId, status: "enrolled" },
    attributes: ["studentId"],
  });
  return enrollments.map((row) => row.studentId);
};

const getClassInstructorIds = async (classId) => {
  if (!classId) return [];
  const instructors = await ClassInstructor.findAll({
    where: { classId },
    attributes: ["instructorId"],
  });
  return instructors.map((row) => row.instructorId);
};

const getPresentationParticipantIds = async (presentationId) => {
  if (!presentationId) return [];

  const presentation = await Presentation.findByPk(presentationId, {
    attributes: ["presentationId", "studentId", "classId", "groupCode"],
  });
  if (!presentation) return [];

  const participantIds = new Set();
  if (presentation.studentId) {
    participantIds.add(presentation.studentId);
  }

  if (presentation.classId && presentation.groupCode) {
    const group = await Group.findOne({
      where: {
        classId: presentation.classId,
        groupName: presentation.groupCode,
      },
      attributes: ["groupId"],
    });

    if (group?.groupId) {
      const members = await GroupStudent.findAll({
        where: { groupId: group.groupId },
        attributes: ["studentId"],
      });
      members.forEach((member) => {
        if (member.studentId) {
          participantIds.add(member.studentId);
        }
      });
    }
  }

  return [...participantIds];
};

export const emitManagementEvent = (event, payload = {}) => {
  emitToRoom("management:admin", event, payload);
};

export const emitUserScopedEvent = (userId, event, payload = {}) => {
  if (!userId) return;
  emitToRoom(`user:${userId}`, event, payload);
};

export const emitInstructorScopedEvent = (userId, event, payload = {}) => {
  if (!userId) return;
  emitToRoom(`instructor:${userId}`, event, payload);
};

export const emitAcademicYearEvent = (subEvent, payload = {}) => {
  emitManagementEvent(`academic-year:${subEvent}`, payload);
};

export const emitAcademicBlockEvent = (subEvent, payload = {}) => {
  emitManagementEvent(`academic-block:${subEvent}`, payload);
};

export const emitDepartmentEvent = (subEvent, payload = {}) => {
  emitManagementEvent(`department:${subEvent}`, payload);
};

export const emitSubjectAreaEvent = (subEvent, payload = {}) => {
  emitManagementEvent(`subject-area:${subEvent}`, payload);
};

export const emitCompetencyCatalogEvent = (subEvent, payload = {}) => {
  emitManagementEvent(`competency:${subEvent}`, payload);
};

export const emitInstructorCompetencyEvent = async (subEvent, payload = {}) => {
  const event = `instructor-competency:${subEvent}`;
  emitManagementEvent(event, payload);
  if (payload.instructorId) {
    emitUserScopedEvent(payload.instructorId, event, payload);
    emitInstructorScopedEvent(payload.instructorId, event, payload);
  }

  if (subEvent === "reviewed" && payload.instructorId) {
    const title =
      payload.status === "approved"
        ? "Nang luc da duoc duyet"
        : "Nang luc bi tu choi";
    const message =
      payload.status === "approved"
        ? "Khai bao nang luc cua ban da duoc phe duyet."
        : payload.rejectionReason || "Khai bao nang luc cua ban da bi tu choi.";
    await saveForUser(payload.instructorId, event, title, message, payload);
  }
};

export const emitCourseEvent = (subEvent, payload = {}) => {
  emitManagementEvent(`course:${subEvent}`, payload);
};

export const emitCourseInstructorEvent = (subEvent, payload = {}) => {
  const event = `course-instructor:${subEvent}`;
  emitManagementEvent(event, payload);
  if (payload.instructorId) {
    emitUserScopedEvent(payload.instructorId, event, payload);
    emitInstructorScopedEvent(payload.instructorId, event, payload);
  }
};

export const emitClassEvent = (subEvent, payload = {}) => {
  emitManagementEvent(`class:${subEvent}`, payload);
};

export const emitClassInstructorEvent = (subEvent, payload = {}) => {
  const event = `class-instructor:${subEvent}`;
  emitManagementEvent(event, payload);
  if (payload.instructorId) {
    emitUserScopedEvent(payload.instructorId, event, payload);
    emitInstructorScopedEvent(payload.instructorId, event, payload);
  }
};

export const emitEnrollKeyEvent = async (subEvent, payload = {}) => {
  const event = `class:enroll-key:${subEvent}`;
  emitManagementEvent(event, payload);

  if (payload.classId) {
    emitToRoom(`class:${payload.classId}`, event, payload);
    emitToInstructors(await getClassInstructorIds(payload.classId), event, payload);
  }

  if (payload.actorUserId) {
    emitUserScopedEvent(payload.actorUserId, event, payload);
    emitInstructorScopedEvent(payload.actorUserId, event, payload);
  }

  if (payload.classId) {
    await saveForClassInstructors(
      payload.classId,
      event,
      subEvent === "created" ? "Ma dang ky moi da duoc tao" : "Ma dang ky da duoc cap nhat",
      payload.message || "Thong tin ma dang ky lop hoc vua thay doi.",
      payload,
    );
  }
};

export const emitGroupAutoAssignedEvent = async (payload = {}) => {
  const event = "group:auto-assigned";
  if (payload.classId) {
    emitToRoom(`class:${payload.classId}`, event, payload);
    emitToUsers(await getClassStudentIds(payload.classId), event, payload);
    emitToInstructors(await getClassInstructorIds(payload.classId), event, payload);
    await saveForClass(
      payload.classId,
      event,
      "Danh sach nhom vua duoc cap nhat",
      payload.message || "Giang vien vua phan nhom tu dong cho lop hoc.",
      payload,
    );
    await saveForClassInstructors(
      payload.classId,
      event,
      "Da phan nhom tu dong",
      payload.message || "Ban vua phan nhom tu dong cho lop hoc.",
      payload,
    );
  }
  emitManagementEvent(event, payload);
};

export const emitSpeakerMappingEvent = async (subEvent, payload = {}) => {
  const event = `speaker:mapping:${subEvent}`;
  if (payload.presentationId) {
    emitToRoom(`presentation:${payload.presentationId}`, event, payload);
    emitToUsers(await getPresentationParticipantIds(payload.presentationId), event, payload);
    const presentation = await Presentation.findByPk(payload.presentationId, {
      attributes: ["classId"],
    });
    if (presentation?.classId) {
      emitToInstructors(await getClassInstructorIds(presentation.classId), event, payload);
    }
    await saveForPresentationInstructors(
      payload.presentationId,
      event,
      "Anh xa speaker da duoc cap nhat",
      payload.message || "Anh xa speaker va transcript vua duoc cap nhat.",
      payload,
    );
  }
};

/**
 * Emit an event to the presentation room.
 * @param {string} event - Full event name (including namespace)
 * @param {number} presentationId
 * @param {object} payload
 */
const emitToPresentationRoom = (event, presentationId, payload) => {
  try {
    const io = getIO();
    const room = `presentation:${presentationId}`;
    console.log(`[SocketEmitter] EMIT → room="${room}" event="${event}" payload=`, payload);
    io.to(room).emit(event, payload);
    console.log(`[SocketEmitter] ✅ Emit succeeded`);
  } catch (err) {
    console.error(`[SocketEmitter] ❌ Emit failed: ${err.message}`);
    console.error(`[SocketEmitter]   → Did you restart the backend after code changes?`);
    console.error(`[SocketEmitter]   → getIO() threw because Socket.IO is not initialized`);
  }
};

/**
 * Emit presentation job events (started, progress, completed, failed).
 *
 * Event name sent: "presentation:job:{subEvent}"  (e.g. "presentation:job:started")
 * Room: "presentation:{presentationId}"
 *
 * @param {string} subEvent - "started" | "progress" | "completed" | "failed"
 * @param {number} presentationId
 * @param {object} payload
 */
export const emitJobEvent = (subEvent, presentationId, payload) => {
  const event = `presentation:job:${subEvent}`;
  console.log(`[SocketEmitter] emitJobEvent("${subEvent}", presentationId=${presentationId}) → will emit "${event}"`);
  emitToPresentationRoom(event, presentationId, {
    presentationId,
    ...payload,
    _ts: Date.now(),
  });
};

/**
 * Emit report generation events.
 *
 * Event name sent: "report:{subEvent}"  (e.g. "report:generated")
 * Room: "presentation:{presentationId}"
 *
 * @param {string} subEvent - "generated" | "failed" | "confirmed" | "rejected"
 * @param {number} presentationId
 * @param {object} payload
 */
const reportNotifMeta = {
  generated:                { title: "Báo cáo AI sẵn sàng",        message: "Báo cáo đánh giá mới đã được tạo xong!" },
  confirmed:                { title: "Báo cáo được xác nhận",       message: "Giảng viên đã xác nhận báo cáo AI của bạn!" },
  rejected:                 { title: "Báo cáo bị từ chối",          message: "Giảng viên đã từ chối báo cáo AI của bạn." },
  "criterion-feedback-changed": { title: "Phản hồi tiêu chí cập nhật", message: "Giảng viên đã cập nhật phản hồi cho một tiêu chí đánh giá." },
};

export const emitReportEvent = (subEvent, presentationId, payload) => {
  const event = `report:${subEvent}`;
  console.log(`[SocketEmitter] emitReportEvent("${subEvent}", presentationId=${presentationId}) → will emit "${event}"`);
  emitToPresentationRoom(event, presentationId, {
    presentationId,
    ...payload,
    _ts: Date.now(),
  });
  const meta = reportNotifMeta[subEvent];
  if (meta) {
    const msg = payload?.message || meta.message;
    saveForPresentation(presentationId, `report:${subEvent}`, meta.title, msg, { presentationId, ...payload });
    if (subEvent === "generated") {
      Presentation.findByPk(presentationId, { attributes: ["classId"] })
        .then(async (presentation) => {
          if (!presentation?.classId) return;
          emitToInstructors(
            await getClassInstructorIds(presentation.classId),
            `report:${subEvent}`,
            { presentationId, ...payload },
          );
          await saveForPresentationInstructors(
            presentationId,
            `report:${subEvent}`,
            "Bao cao AI can duoc xu ly",
            "Mot bao cao AI moi da san sang de giang vien xem va xac nhan.",
            { presentationId, ...payload },
          );
        })
        .catch((err) => {
          console.error(`[SocketEmitter] report generated instructor fan-out failed: ${err.message}`);
        });
    }
  }
};

/**
 * Emit upload permission change for a class.
 *
 * Event name sent: "class:upload-permission-changed"
 * Room: "class:{classId}"
 *
 * @param {number} classId
 * @param {object} payload
 */
export const emitUploadPermissionChanged = (classId, payload) => {
  try {
    const io = getIO();
    const eventPayload = {
      classId,
      ...payload,
      _ts: Date.now(),
    };
    io.to(`class:${classId}`).emit("class:upload-permission-changed", eventPayload);
    console.log(`[SocketEmitter] EMIT → room="class:${classId}" event="class:upload-permission-changed"`);
    getClassStudentIds(classId)
      .then((userIds) => emitToUsers(userIds, "class:upload-permission-changed", eventPayload))
      .catch((err) => console.error(`[SocketEmitter] upload-permission student fan-out failed: ${err.message}`));
    getClassInstructorIds(classId)
      .then((userIds) => emitToInstructors(userIds, "class:upload-permission-changed", eventPayload))
      .catch((err) => console.error(`[SocketEmitter] upload-permission instructor fan-out failed: ${err.message}`));
    const enabled = payload?.isUploadEnabled;
    saveForClass(
      classId,
      "class:upload-permission-changed",
      "Quyền nộp bài thay đổi",
      enabled ? "Giảng viên đã mở quyền nộp bài cho lớp." : "Giảng viên đã đóng quyền nộp bài.",
      { classId, ...payload }
    );
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitUploadPermissionChanged failed: ${err.message}`);
  }
};

/**
 * Emit grade distribution submitted by leader.
 * Room: "group:{groupId}"
 *
 * @param {number} groupId
 * @param {number} reportId
 * @param {object} distribution - full distribution with members
 */
export const emitGradeDistributed = (groupId, reportId, distribution) => {
  try {
    const io = getIO();
    const payload = { groupId, reportId, distribution, _ts: Date.now() };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:distributed" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:distributed", payload);
    console.log(`[SocketEmitter] ✅ emitGradeDistributed succeeded`);
    saveForGroup(groupId, "grade:distributed", "Điểm đã được phân chia", "Trưởng nhóm đã phân chia điểm cho các thành viên.", { groupId, reportId });
    if (distribution?.group?.classId) {
      getClassInstructorIds(distribution.group.classId)
        .then((userIds) => emitToInstructors(userIds, "grade:distributed", payload))
        .catch((err) => console.error(`[SocketEmitter] grade:distributed instructor fan-out failed: ${err.message}`));
      saveForClassInstructors(
        distribution.group.classId,
        "grade:distributed",
        "Leader da chia diem",
        `Nhom ${distribution.group.groupName || groupId} da nop bang chia diem va cho giang vien xu ly.`,
        { groupId, reportId, distribution },
      );
    }
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitGradeDistributed failed: ${err.message}`);
  }
};

/**
 * Emit grade distribution finalized by instructor.
 * Room: "group:{groupId}"
 *
 * @param {number} groupId
 * @param {number} reportId
 * @param {object} distribution - full distribution with members
 */
export const emitGradeFinalized = (groupId, reportId, distribution) => {
  try {
    const io = getIO();
    const payload = { groupId, reportId, distribution, _ts: Date.now() };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:finalized" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:finalized", payload);
    console.log(`[SocketEmitter] ✅ emitGradeFinalized succeeded`);
    saveForGroup(groupId, "grade:finalized", "Điểm đã được chốt", "Điểm đã được chốt bởi giảng viên.", { groupId, reportId });
    if (distribution?.group?.classId) {
      getClassInstructorIds(distribution.group.classId)
        .then((userIds) => emitToInstructors(userIds, "grade:finalized", payload))
        .catch((err) => console.error(`[SocketEmitter] grade:finalized instructor fan-out failed: ${err.message}`));
      saveForClassInstructors(
        distribution.group.classId,
        "grade:finalized",
        "Diem nhom da duoc chot",
        `Ban da chot diem cho nhom ${distribution.group.groupName || groupId}.`,
        { groupId, reportId, distribution },
      );
    }
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitGradeFinalized failed: ${err.message}`);
  }
};

/**
 * Emit grade distribution reopened by instructor.
 * Room: "group:{groupId}"
 *
 * @param {number} groupId
 * @param {number} reportId
 * @param {object} distribution
 */
export const emitGradeReopened = (groupId, reportId, distribution) => {
  try {
    const io = getIO();
    const payload = { groupId, reportId, distribution, _ts: Date.now() };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:reopened" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:reopened", payload);
    console.log(`[SocketEmitter] ✅ emitGradeReopened succeeded`);
    saveForGroup(groupId, "grade:reopened", "Điểm được mở lại", "Giảng viên đã mở lại việc phân chia điểm.", { groupId, reportId });
    if (distribution?.group?.classId) {
      getClassInstructorIds(distribution.group.classId)
        .then((userIds) => emitToInstructors(userIds, "grade:reopened", payload))
        .catch((err) => console.error(`[SocketEmitter] grade:reopened instructor fan-out failed: ${err.message}`));
      saveForClassInstructors(
        distribution.group.classId,
        "grade:reopened",
        "Bang diem nhom da duoc mo lai",
        `Ban vua mo lai bang diem cua nhom ${distribution.group.groupName || groupId}.`,
        { groupId, reportId, distribution },
      );
    }
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitGradeReopened failed: ${err.message}`);
  }
};

/**
 * Emit member feedback update for a grade distribution.
 * Room: "group:{groupId}"
 *
 * @param {number} groupId
 * @param {number} reportId
 * @param {object} distribution
 */
export const emitGradeFeedbackUpdated = (groupId, reportId, distribution) => {
  try {
    const io = getIO();
    const payload = { groupId, reportId, distribution, _ts: Date.now() };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:feedback-updated" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:feedback-updated", payload);
    console.log(`[SocketEmitter] ✅ emitGradeFeedbackUpdated succeeded`);
    saveForGroup(groupId, "grade:feedback-updated", "Phản hồi điểm cập nhật", "Phản hồi về điểm số của bạn đã được cập nhật.", { groupId, reportId });
    if (distribution?.group?.classId) {
      getClassInstructorIds(distribution.group.classId)
        .then((userIds) => emitToInstructors(userIds, "grade:feedback-updated", payload))
        .catch((err) => console.error(`[SocketEmitter] grade:feedback-updated instructor fan-out failed: ${err.message}`));
      saveForClassInstructors(
        distribution.group.classId,
        "grade:feedback-updated",
        "Thanh vien vua gui phan hoi diem",
        `Co phan hoi moi ve bang diem cua nhom ${distribution.group.groupName || groupId}.`,
        { groupId, reportId, distribution },
      );
    }
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitGradeFeedbackUpdated failed: ${err.message}`);
  }
};

/**
 * Emit criterion feedback change for a presentation report.
 * Room: "presentation:{presentationId}"
 *
 * @param {number} presentationId
 * @param {number} reportId
 * @param {object} payload
 */
export const emitCriterionFeedbackChanged = (presentationId, reportId, payload = {}) => {
  try {
    const io = getIO();
    const room = `presentation:${presentationId}`;
    const data = { presentationId, reportId, ...payload, _ts: Date.now() };
    console.log(`[SocketEmitter] EMIT → room="${room}" event="report:criterion-feedback-changed" payload=`, data);
    io.to(room).emit("report:criterion-feedback-changed", data);
    console.log(`[SocketEmitter] ✅ emitCriterionFeedbackChanged succeeded`);
    saveForPresentation(presentationId, "report:criterion-feedback-changed", "Phản hồi tiêu chí cập nhật", "Giảng viên đã cập nhật phản hồi cho một tiêu chí đánh giá.", { presentationId, reportId });
    Presentation.findByPk(presentationId, { attributes: ["classId"] })
      .then(async (presentation) => {
        if (!presentation?.classId) return;
        emitToInstructors(
          await getClassInstructorIds(presentation.classId),
          "report:criterion-feedback-changed",
          data,
        );
        await saveForPresentationInstructors(
          presentationId,
          "report:criterion-feedback-changed",
          "Feedback tieu chi da duoc cap nhat",
          payload?.message || "Feedback rubric cua bai thuyet trinh vua duoc cap nhat.",
          data,
        );
      })
      .catch((err) => {
        console.error(`[SocketEmitter] criterion feedback instructor fan-out failed: ${err.message}`);
      });
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitCriterionFeedbackChanged failed: ${err.message}`);
  }
};
