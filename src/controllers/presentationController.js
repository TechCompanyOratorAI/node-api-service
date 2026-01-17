import { validationResult } from 'express-validator';
import presentationService from '../services/presentationService.js';

class PresentationController {
  async createPresentation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { topicId, title, description } = req.body;
      const result = await presentationService.createPresentation({
        topicId: parseInt(topicId),
        studentId: req.user.userId,
        title,
        description
      });

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Create presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async uploadSlide(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Slide file is required' });
      }

      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);
      const slideNumber = req.body.slideNumber ? parseInt(req.body.slideNumber) : null;

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      if (slideNumber && Number.isNaN(slideNumber)) {
        return res.status(400).json({ success: false, message: 'slideNumber must be a number' });
      }

      const result = await presentationService.uploadSlide({
        presentationId: parsedPresentationId,
        studentId: req.user.userId,
        slideNumber,
        file: req.file
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Upload slide controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async uploadMedia(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Media file is required' });
      }

      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);
      const durationSeconds = req.body.durationSeconds ? parseInt(req.body.durationSeconds) : null;
      const sampleRate = req.body.sampleRate ? parseInt(req.body.sampleRate) : null;
      const recordingMethod = req.body.recordingMethod || null;

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      if (durationSeconds && Number.isNaN(durationSeconds)) {
        return res.status(400).json({ success: false, message: 'durationSeconds must be a number' });
      }

      if (sampleRate && Number.isNaN(sampleRate)) {
        return res.status(400).json({ success: false, message: 'sampleRate must be a number' });
      }

      const result = await presentationService.uploadMedia({
        presentationId: parsedPresentationId,
        studentId: req.user.userId,
        file: req.file,
        durationSeconds,
        sampleRate,
        recordingMethod
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Upload media controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export default new PresentationController();
