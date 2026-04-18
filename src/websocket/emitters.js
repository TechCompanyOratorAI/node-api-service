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
export const emitReportEvent = (subEvent, presentationId, payload) => {
  const event = `report:${subEvent}`;
  console.log(`[SocketEmitter] emitReportEvent("${subEvent}", presentationId=${presentationId}) → will emit "${event}"`);
  emitToPresentationRoom(event, presentationId, {
    presentationId,
    ...payload,
    _ts: Date.now(),
  });
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
    const payload = {
      groupId,
      reportId,
      distribution,
      _ts: Date.now(),
    };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:distributed" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:distributed", payload);
    console.log(`[SocketEmitter] ✅ emitGradeDistributed succeeded`);
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitGradeDistributed failed: ${err.message}`);
    console.error(`[SocketEmitter]   → Did you restart the backend after code changes?`);
    console.error(`[SocketEmitter]   → getIO() threw because Socket.IO is not initialized`);
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
    const payload = {
      groupId,
      reportId,
      distribution,
      _ts: Date.now(),
    };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:finalized" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:finalized", payload);
    console.log(`[SocketEmitter] ✅ emitGradeFinalized succeeded`);
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitGradeFinalized failed: ${err.message}`);
    console.error(`[SocketEmitter]   → Did you restart the backend after code changes?`);
    console.error(`[SocketEmitter]   → getIO() threw because Socket.IO is not initialized`);
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
    const payload = {
      groupId,
      reportId,
      distribution,
      _ts: Date.now(),
    };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:reopened" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:reopened", payload);
    console.log(`[SocketEmitter] ✅ emitGradeReopened succeeded`);
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
    const payload = {
      groupId,
      reportId,
      distribution,
      _ts: Date.now(),
    };
    console.log(`[SocketEmitter] EMIT → room="group:${groupId}" event="grade:feedback-updated" payload=`, payload);
    io.to(`group:${groupId}`).emit("grade:feedback-updated", payload);
    console.log(`[SocketEmitter] ✅ emitGradeFeedbackUpdated succeeded`);
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
    const data = {
      presentationId,
      reportId,
      ...payload,
      _ts: Date.now(),
    };
    console.log(`[SocketEmitter] EMIT → room="${room}" event="report:criterion-feedback-changed" payload=`, data);
    io.to(room).emit("report:criterion-feedback-changed", data);
    console.log(`[SocketEmitter] ✅ emitCriterionFeedbackChanged succeeded`);
  } catch (err) {
    console.error(`[SocketEmitter] ❌ emitCriterionFeedbackChanged failed: ${err.message}`);
  }
};
