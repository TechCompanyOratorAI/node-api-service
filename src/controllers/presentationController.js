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

      const { topicId, title, description, groupCode } = req.body;
      const result = await presentationService.createPresentation({
        topicId: parseInt(topicId),
        studentId: req.user.userId,
        title,
        description,
        groupCode
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

  async submitPresentation(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const result = await presentationService.submitPresentation(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Submit presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getPresentationById(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const result = await presentationService.getPresentationById(
        parsedPresentationId,
        req.user.userId,
        req.user.role
      );

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Get presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getAllPresentations(req, res) {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      const result = await presentationService.getAllPresentations(
        req.user.userId,
        {
          status,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get all presentations controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async updatePresentation(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const { title, description, groupCode } = req.body;

      const result = await presentationService.updatePresentation(
        parsedPresentationId,
        req.user.userId,
        { title, description }
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Update presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async deletePresentation(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const result = await presentationService.deletePresentation(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Delete presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getProcessingStatus(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const result = await presentationService.getProcessingStatus(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get processing status controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getAnalysisResults(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const result = await presentationService.getAnalysisResults(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get analysis results controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getPresentationsByCourse(req, res) {
    try {
      const { courseId } = req.params;
      const parsedCourseId = parseInt(courseId);

      if (Number.isNaN(parsedCourseId)) {
        return res.status(400).json({ success: false, message: 'courseId must be a number' });
      }

      const { status, limit = 50, offset = 0 } = req.query;

      const result = await presentationService.getPresentationsByCourse(
        parsedCourseId,
        {
          status,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get presentations by course controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export default new PresentationController();
