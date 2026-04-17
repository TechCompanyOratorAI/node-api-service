/**
 * ⚠️  DEV BYPASS CONTROLLER — FOR TESTING ONLY ⚠️
 *
 * Không có authentication. Không có rate limit.
 * Chỉ dùng trong môi trường development / staging.
 */

import devBypassService from "../services/devBypassService.js";

class DevBypassController {
  /**
   * GET /dev/bypass/presentations
   * Liệt kê các presentations có sẵn để chọn dùng
   */
  async listPresentations(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const result = await devBypassService.listPresentations(limit);
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("[DevBypass] listPresentations controller error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * POST /dev/bypass/presentations/:presentationId/slides
   * Upload slide (bypass auth)
   * Body: multipart/form-data, field "file"
   */
  async uploadSlide(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Slide file is required (field: file)" });
      }

      const presentationId = parseInt(req.params.presentationId);
      if (Number.isNaN(presentationId)) {
        return res.status(400).json({ success: false, message: "presentationId must be a number" });
      }

      const slideNumber = req.body.slideNumber ? parseInt(req.body.slideNumber) : null;

      const result = await devBypassService.uploadSlide({
        presentationId,
        slideNumber,
        file: req.file,
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("[DevBypass] uploadSlide controller error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * POST /dev/bypass/presentations/:presentationId/media
   * Upload audio/video (bypass auth)
   * Body: multipart/form-data, field "file"
   * Optional body fields: durationSeconds, sampleRate, recordingMethod
   */
  async uploadMedia(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Media file is required (field: file)" });
      }

      const presentationId = parseInt(req.params.presentationId);
      if (Number.isNaN(presentationId)) {
        return res.status(400).json({ success: false, message: "presentationId must be a number" });
      }

      const durationSeconds = req.body.durationSeconds ? parseInt(req.body.durationSeconds) : null;
      const sampleRate = req.body.sampleRate ? parseInt(req.body.sampleRate) : null;
      const recordingMethod = req.body.recordingMethod || "upload";

      const result = await devBypassService.uploadMedia({
        presentationId,
        file: req.file,
        durationSeconds,
        sampleRate,
        recordingMethod,
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("[DevBypass] uploadMedia controller error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * POST /dev/bypass/presentations/:presentationId/run
   * Trigger full pipeline (bypass auth + status check)
   * Tương đương submit/resubmit nhưng không có điều kiện gì
   */
  async triggerFullPipeline(req, res) {
    try {
      const presentationId = parseInt(req.params.presentationId);
      if (Number.isNaN(presentationId)) {
        return res.status(400).json({ success: false, message: "presentationId must be a number" });
      }

      const result = await devBypassService.triggerFullPipeline(presentationId);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("[DevBypass] triggerFullPipeline controller error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

export default new DevBypassController();
