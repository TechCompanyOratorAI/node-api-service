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
import {
  saveForPresentation,
  saveForGroup,
  saveForClass,
} from "../services/notificationService.js";

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
    io.to(`class:${classId}`).emit("class:upload-permission-changed", {
      classId,
      ...payload,
      _ts: Date.now(),
    });
    console.log(`[SocketEmitter] EMIT → room="class:${classId}" event="class:upload-permission-changed"`);
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
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitCriterionFeedbackChanged failed: ${err.message}`);
  }
};
