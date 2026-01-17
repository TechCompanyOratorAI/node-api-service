import crypto from 'crypto';
import path from 'path';
import db from '../models/index.js';
import storageService from './storageService.js';

const { Presentation, Topic, TopicEnrollment, Slide, AudioRecord } = db;

const sanitizeFileName = (filename) => {
  const baseName = path.basename(filename || 'file');
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

class PresentationService {
  async createPresentation({ topicId, studentId, title, description }) {
    try {
      const topic = await Topic.findByPk(topicId);
      if (!topic) {
        return { success: false, message: 'Topic not found' };
      }

      const enrollment = await TopicEnrollment.findOne({
        where: { topicId, studentId, status: 'enrolled' }
      });

      if (!enrollment) {
        return { success: false, message: 'You are not enrolled in this topic' };
      }

      const presentation = await Presentation.create({
        studentId,
        courseId: topic.courseId,
        topicId,
        title,
        description,
        status: 'draft'
      });

      return { success: true, presentation };
    } catch (error) {
      console.error('Create presentation error:', error);
      return { success: false, message: 'Failed to create presentation', error: error.message };
    }
  }

  async uploadSlide({ presentationId, studentId, slideNumber, file }) {
    try {
      const accessResult = await this.getPresentationForStudent(presentationId, studentId);
      if (!accessResult.success) {
        return accessResult;
      }

      const presentation = accessResult.presentation;
      let nextSlideNumber = slideNumber;

      if (!nextSlideNumber) {
        const latestSlide = await Slide.findOne({
          where: { presentationId: presentation.presentationId },
          order: [['slideNumber', 'DESC']],
          attributes: ['slideNumber']
        });
        nextSlideNumber = latestSlide?.slideNumber ? latestSlide.slideNumber + 1 : 1;
      }

      const extension = path.extname(file.originalname || '');
      const uniqueSuffix = crypto.randomBytes(6).toString('hex');
      const safeName = sanitizeFileName(file.originalname || `slide-${nextSlideNumber}${extension}`);
      const key = `presentations/${presentation.presentationId}/slides/${nextSlideNumber}-${uniqueSuffix}-${safeName}`;

      const uploadResult = await storageService.uploadBuffer({
        key,
        body: file.buffer,
        contentType: file.mimetype
      });

      const slide = await Slide.create({
        presentationId: presentation.presentationId,
        slideNumber: nextSlideNumber,
        filePath: uploadResult.url,
        fileName: file.originalname,
        fileFormat: file.mimetype,
        fileSizeBytes: file.size,
        uploadedAt: new Date()
      });

      return { success: true, slide };
    } catch (error) {
      console.error('Upload slide error:', error);
      return { success: false, message: 'Failed to upload slide', error: error.message };
    }
  }

  async uploadMedia({ presentationId, studentId, file, durationSeconds, sampleRate, recordingMethod }) {
    try {
      const accessResult = await this.getPresentationForStudent(presentationId, studentId);
      if (!accessResult.success) {
        return accessResult;
      }

      const presentation = accessResult.presentation;
      const extension = path.extname(file.originalname || '');
      const uniqueSuffix = crypto.randomBytes(6).toString('hex');
      const safeName = sanitizeFileName(file.originalname || `media${extension}`);
      const key = `presentations/${presentation.presentationId}/media/${Date.now()}-${uniqueSuffix}-${safeName}`;

      const uploadResult = await storageService.uploadBuffer({
        key,
        body: file.buffer,
        contentType: file.mimetype
      });

      const payload = {
        presentationId: presentation.presentationId,
        filePath: uploadResult.url,
        fileName: file.originalname,
        fileFormat: file.mimetype,
        fileSizeBytes: file.size,
        durationSeconds: durationSeconds || null,
        sampleRate: sampleRate || null,
        recordingMethod: recordingMethod || 'upload',
        uploadedAt: new Date()
      };

      const existing = await AudioRecord.findOne({
        where: { presentationId: presentation.presentationId }
      });

      let audioRecord = null;
      if (existing) {
        await AudioRecord.update(payload, {
          where: { presentationId: presentation.presentationId }
        });
        audioRecord = await AudioRecord.findOne({
          where: { presentationId: presentation.presentationId }
        });
      } else {
        audioRecord = await AudioRecord.create(payload);
      }

      if (durationSeconds && !presentation.durationSeconds) {
        await Presentation.update(
          { durationSeconds },
          { where: { presentationId: presentation.presentationId } }
        );
      }

      return { success: true, audioRecord };
    } catch (error) {
      console.error('Upload media error:', error);
      return { success: false, message: 'Failed to upload media', error: error.message };
    }
  }

  async getPresentationForStudent(presentationId, studentId) {
    try {
      const presentation = await Presentation.findOne({
        where: { presentationId, studentId }
      });

      if (!presentation) {
        return { success: false, message: 'Presentation not found or access denied' };
      }

      const enrollment = await TopicEnrollment.findOne({
        where: { topicId: presentation.topicId, studentId, status: 'enrolled' }
      });

      if (!enrollment) {
        return { success: false, message: 'You are not enrolled in this topic' };
      }

      return { success: true, presentation };
    } catch (error) {
      console.error('Get presentation access error:', error);
      return { success: false, message: 'Failed to verify presentation access', error: error.message };
    }
  }
}

export default new PresentationService();
