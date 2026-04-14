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
