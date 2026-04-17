/**
 * ⚠️  DEV BYPASS ROUTES — FOR TESTING ONLY ⚠️
 *
 * Không có authentication. Không có rate limit.
 * Đăng ký trong routes/index.js tại prefix /dev/bypass
 *
 * Endpoints:
 *   GET  /dev/bypass/presentations                         → list presentations
 *   POST /dev/bypass/presentations/:presentationId/slides  → upload slide (no auth)
 *   POST /dev/bypass/presentations/:presentationId/media   → upload media (no auth)
 *   POST /dev/bypass/presentations/:presentationId/run     → trigger full pipeline
 */

import express from "express";
import devBypassController from "../controllers/devBypassController.js";
import { uploadSlide, uploadMedia, uploadErrorHandler } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// List available presentations
router.get("/presentations", devBypassController.listPresentations);

// Upload slide (bypass auth)
router.post(
  "/presentations/:presentationId/slides",
  uploadSlide.single("file"),
  uploadErrorHandler,
  devBypassController.uploadSlide
);

// Upload audio/video (bypass auth)
router.post(
  "/presentations/:presentationId/media",
  uploadMedia.single("file"),
  uploadErrorHandler,
  devBypassController.uploadMedia
);

// Trigger full job pipeline (bypass auth + status)
router.post("/presentations/:presentationId/run", devBypassController.triggerFullPipeline);

export default router;
