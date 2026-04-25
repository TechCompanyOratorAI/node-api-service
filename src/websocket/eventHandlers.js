/**
 * Socket.IO event handlers.
 * Each handler receives (io, socket) and registers listeners.
 * For now, this module registers client → server request handlers.
 * Server → client emit helpers are exported as standalone functions below.
 */

/* ─────────────────────────────────────────────
   Helper: emit to specific rooms
───────────────────────────────────────────── */
export const emitToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToClass = (io, classId, event, data) => {
  io.to(`class:${classId}`).emit(event, data);
};

export const emitToPresentation = (io, presentationId, event, data) => {
  io.to(`presentation:${presentationId}`).emit(event, data);
};

export const emitToInstructor = (io, userId, event, data) => {
  io.to(`instructor:${userId}`).emit(event, data);
};

/* ─────────────────────────────────────────────
   Register event handlers (client → server)
───────────────────────────────────────────── */
export const registerEventHandlers = (io, socket) => {
  /* Client joins rooms */

  socket.on("join:user", (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on("join:class", (classId) => {
    socket.join(`class:${classId}`);
  });

  socket.on("join:presentation", (presentationId) => {
    console.log(`[Socket.IO] join:presentation received → socket.join("presentation:${presentationId}")`);
    socket.join(`presentation:${presentationId}`);
  });

  /* Client leaves rooms */

  socket.on("leave:class", (classId) => {
    socket.leave(`class:${classId}`);
  });

  socket.on("leave:presentation", (presentationId) => {
    socket.leave(`presentation:${presentationId}`);
  });

  /* Ping / heartbeat */

  socket.on("ping", () => {
    socket.emit("pong", { timestamp: Date.now() });
  });

  /* ── Class upload permission ── */

  /**
   * Client requests to join a class room (typically student page loads).
   * Auto-joins the class room so they receive permission change events.
   */
  socket.on("class:subscribe", ({ classId }) => {
    socket.join(`class:${classId}`);
  });

  socket.on("class:unsubscribe", ({ classId }) => {
    socket.leave(`class:${classId}`);
  });

  socket.on("join:group", (groupId) => {
    console.log(`[Socket.IO] join:group received → socket.join("group:${groupId}")`);
    socket.join(`group:${groupId}`);
  });

  socket.on("leave:group", (groupId) => {
    socket.leave(`group:${groupId}`);
  });
};
