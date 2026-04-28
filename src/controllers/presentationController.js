import { validationResult } from 'express-validator';
import presentationService from '../services/presentationService.js';

class PresentationController {
  async createPresentation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation thất bại',
          errors: errors.array()
        });
      }

      const { classId, topicId, title, description, groupCode } = req.body;
      const result = await presentationService.createPresentation({
        classId: parseInt(classId),
        topicId: parseInt(topicId),
        studentId: req.user.userId,
        title,
        description,
        groupCode
      });

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Create presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async uploadSlide(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
      }

      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);
      const slideNumber = req.body.slideNumber ? parseInt(req.body.slideNumber) : null;

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      if (slideNumber && Number.isNaN(slideNumber)) {
        return res.status(400).json({ success: false, message: 'SlideNumber phải là số' });
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
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async uploadMedia(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
      }

      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);
      const durationSeconds = req.body.durationSeconds ? parseInt(req.body.durationSeconds) : null;
      const sampleRate = req.body.sampleRate ? parseInt(req.body.sampleRate) : null;
      const recordingMethod = req.body.recordingMethod || null;

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      if (durationSeconds && Number.isNaN(durationSeconds)) {
        return res.status(400).json({ success: false, message: 'DurationSeconds phải là số' });
      }

      if (sampleRate && Number.isNaN(sampleRate)) {
        return res.status(400).json({ success: false, message: 'SampleRate phải là số' });
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
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async submitPresentation(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.submitPresentation(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Submit presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async resubmitPresentation(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.resubmitPresentation(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Resubmit presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async getPresentationById(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.getPresentationById(
        parsedPresentationId,
        req.user.userId,
        req.user.role
      );

      if (!result.success) {
        // Return 403 for access denied, 404 for not found
        const statusCode = result.message === "Access denied" ? 403 : 404;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Get presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async getAllPresentations(req, res) {
    try {
      const { status, classId, topicId, limit = 50, offset = 0 } = req.query;

      const result = await presentationService.getAllPresentations(
        req.user.userId,
        {
          status,
          classId,
          topicId,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get all presentations controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async updatePresentation(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
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
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async deletePresentation(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.deletePresentation(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Delete presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async getProcessingStatus(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.getProcessingStatus(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get processing status controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async getAnalysisResults(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.getAnalysisResults(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get analysis results controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async getPresentationsByCourse(req, res) {
    try {
      const { courseId } = req.params;
      const parsedCourseId = parseInt(courseId);

      if (Number.isNaN(parsedCourseId)) {
        return res.status(400).json({ success: false, message: 'Môn họcId phải là số' });
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
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  async getAnalysisProgress(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.getAnalysisProgress(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get analysis progress controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }

  // Get AI feedback for a presentation
  async getAIFeedback(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedPresentationId = parseInt(presentationId);

      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({ success: false, message: 'PresentationId phải là số' });
      }

      const result = await presentationService.getAIFeedback(
        parsedPresentationId,
        req.user.userId
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get AI feedback controller error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  }
}

export default new PresentationController();
