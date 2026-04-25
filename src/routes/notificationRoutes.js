import express from "express";
import notificationController from "../controllers/notificationController.js";
import { authenticateToken, requireEmailVerification } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken, requireEmailVerification);

router.get("/", notificationController.getMyNotifications);
router.patch("/read-all", notificationController.markAllRead);

export default router;
