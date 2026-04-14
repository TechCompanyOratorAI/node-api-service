import { Server } from "socket.io";
import { authenticateSocket } from "./authSocket.js";
import { registerEventHandlers } from "./eventHandlers.js";

let io = null;

/**
 * Initialize Socket.IO server attached to the existing HTTP server.
 * Call this AFTER `app.listen(...)` so we get the raw httpServer.
 */
export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /* ── Authentication middleware ── */
  io.use(authenticateSocket);

  /* ── Connection handler ── */
  io.on("connection", (socket) => {
    const userId = socket.user?.userId;
    console.log(`[Socket.IO] Client connected: userId=${userId} (socket=${socket.id})`);

    // Auto-join personal user room
    if (userId) {
      socket.join(`user:${userId}`);
      socket.join(`instructor:${userId}`);
    }

    // Register request handlers
    registerEventHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Client disconnected: userId=${userId} reason=${reason}`);
    });

    socket.on("error", (err) => {
      console.error(`[Socket.IO] Socket error: userId=${userId}`, err.message);
    });
  });

  console.log("[Socket.IO] Server initialized");
  return io;
};

/** Get the io instance from anywhere in the codebase. */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocketIO first.");
  }
  return io;
};
