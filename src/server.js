require("dotenv").config();

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import viewEngine from "./config/viewEngine.js";
import initWebRoutes from "./route/web.js";
import connectDB from "./config/conectDB.js";
import cors from "cors";
import http from "http";
import { initSocketIO } from "./websocket/index.js";
import { startDeadlineReminderScheduler } from "./services/deadlineReminderService.js";

let app = express();
let httpServer = http.createServer(app); // keep raw server so Socket.IO can attach

// Trust proxy (required when running behind nginx/load balancer with X-Forwarded-For)
app.set("trust proxy", 1);

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Static file serving for uploads
app.use("/uploads", express.static("uploads"));

viewEngine(app);
initWebRoutes(app);

connectDB();

// Auto-create Notifications table if not exists
const db = require("./models/index.js");
db.Notification.sync({ alter: true }).catch((err) =>
  console.error("[DB] Notification sync failed:", err.message)
);

let port = process.env.PORT || 8080;

httpServer.listen(port, () => {
  console.log("Backend Nodejs is running on the port: " + port);
  initSocketIO(httpServer);
  startDeadlineReminderScheduler();
});
