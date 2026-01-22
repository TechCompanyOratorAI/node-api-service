import crypto from 'crypto';
import path from 'path';
import db from '../models/index.js';
import storageService from './storageService.js';
import jobService from './jobService.js';
import speakerService from './speakerService.js';

const {
  Presentation,
  Topic,
  TopicEnrollment,
  Slide,
  AudioRecord,
  Transcript,
  TranscriptSegment,
  Job,
  Speaker,
  Feedback,
  AnalysisResult,
  User,
  Course
} = db;

const sanitizeFileName = (filename) => {
  const baseName = path.basename(filename || 'file');
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Detect number of pages in a slide file
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<number>} - Number of pages
 */
const detectPageCount = async (fileBuffer, mimeType) => {
  try {
    // PDF files
    if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf') {
      // Try to count pages by searching for /Count in PDF structure
      // Simple method: count occurrences of /Type/Page or /Page
      const pdfText = fileBuffer.toString('binary');
      const pageMatches = pdfText.match(/\/Type[\s]*\/Page[^s]/g);
      if (pageMatches) {
        return pageMatches.length;
      }
      
      // Alternative: count /Count entries (less reliable)
      const countMatches = pdfText.match(/\/Count[\s]+(\d+)/g);
      if (countMatches) {
        // Try to extract the largest count value
        const counts = countMatches.map(match => {
          const numMatch = match.match(/\d+/);
          return numMatch ? parseInt(numMatch[0]) : 0;
        });
        return Math.max(...counts, 1);
      }
      
      // Fallback: estimate based on file size (very rough)
      // Average PDF page is ~50-100KB, but this is unreliable
      return 1; // Default to 1 if can't detect
    }
    
    // PowerPoint files (.pptx)
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        mimeType === 'application/vnd.ms-powerpoint') {
      // PPTX is a ZIP file, count slides by counting slide XML files
      // This requires unzipping, which is complex. For now, return 1.
      // TODO: Implement proper PPTX page counting using JSZip or similar
      return 1; // Placeholder
    }
    
    // Image files (single page)
    if (mimeType.startsWith('image/')) {
      return 1;
    }
    
    // Default: assume 1 page
    return 1;
  } catch (error) {
    console.error('Error detecting page count:', error);
    return 1; // Default to 1 page on error
  }
};

class PresentationService {
  async createPresentation({ topicId, studentId, title, description, groupCode }) {
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
        groupCode,
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
      
      // Detect number of pages in the file
      const pageCount = await detectPageCount(file.buffer, file.mimetype);
      
      // Use pageCount as slideNumber (or use provided slideNumber if specified)
      // slideNumber represents the number of pages in this slide file
      const finalSlideNumber = slideNumber || pageCount;
      
      console.log(`📄 Detected ${pageCount} pages in file, using slideNumber: ${finalSlideNumber}`);

      const extension = path.extname(file.originalname || '');
      const uniqueSuffix = crypto.randomBytes(6).toString('hex');
      const safeName = sanitizeFileName(file.originalname || `slide-${finalSlideNumber}${extension}`);
      const key = `presentations/${presentation.presentationId}/slides/${finalSlideNumber}-${uniqueSuffix}-${safeName}`;

      const uploadResult = await storageService.uploadBuffer({
        key,
        body: file.buffer,
        contentType: file.mimetype
      });

      const slide = await Slide.create({
        presentationId: presentation.presentationId,
        slideNumber: finalSlideNumber,
        filePath: uploadResult.url,
        fileName: file.originalname,
        fileFormat: file.mimetype,
        fileSizeBytes: file.size,
        uploadedAt: new Date()
      });

      // Create job and send to slides queue for OCR + embeddings processing
      try {
        const job = await jobService.createJob(
          presentation.presentationId,
          'slides',
          {
            slideId: slide.slideId,
            slideUrl: uploadResult.url,
            slideNumber: finalSlideNumber,
            pageCount: pageCount, // Also include detected page count
            fileName: file.originalname,
            fileFormat: file.mimetype
          }
        );
        console.log(`✅ Created slides job ${job.jobId} for slide ${slide.slideId} (${pageCount} pages)`);
      } catch (jobError) {
        // Log error but don't fail the upload
        console.error('⚠️ Failed to create slides job:', jobError);
      }

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

  /**
   * Submit presentation for processing
   * Validates completeness → Creates ASR job → Pushes to SQS queue
   * @param {number} presentationId 
   * @param {number} studentId 
   * @returns {Promise<object>}
   */
  async submitPresentation(presentationId, studentId) {
    try {
      // Verify access
      const accessResult = await this.getPresentationForStudent(presentationId, studentId);
      if (!accessResult.success) {
        return accessResult;
      }

      const presentation = accessResult.presentation;

      // Validate presentation is complete
      const validationResult = await this.validatePresentationForSubmission(presentationId);
      if (!validationResult.isValid) {
        return {
          success: false,
          message: 'Presentation is not ready for submission',
          validation: validationResult
        };
      }

      // Check if already submitted
      if (presentation.status === 'processing' || presentation.status === 'completed') {
        return {
          success: false,
          message: `Presentation is already ${presentation.status}`
        };
      }

      // Update presentation status
      await Presentation.update(
        {
          status: 'processing',
          submittedAt: new Date()
        },
        { where: { presentationId } }
      );

      // Create ASR job (this will also push to SQS queue)
      const job = await jobService.createJob(
        presentationId,
        'asr',
        {
          submittedBy: studentId,
          submittedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Submitted presentation ${presentationId} for processing, job ${job.jobId}`);

      return {
        success: true,
        message: 'Presentation submitted successfully',
        presentation: await this.getPresentationById(presentationId, studentId),
        job
      };
    } catch (error) {
      console.error('Submit presentation error:', error);
      return {
        success: false,
        message: 'Failed to submit presentation',
        error: error.message
      };
    }
  }

  /**
   * Validate presentation is ready for submission
   * @param {number} presentationId 
   * @returns {Promise<object>}
   */
  async validatePresentationForSubmission(presentationId) {
    try {
      const presentation = await Presentation.findByPk(presentationId, {
        include: [
          { model: Slide, as: 'slides' },
          { model: AudioRecord, as: 'audioRecord' }
        ]
      });

      const validation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      if (!presentation) {
        validation.isValid = false;
        validation.errors.push('Presentation not found');
        return validation;
      }

      // Check for audio
      if (!presentation.audioRecord) {
        validation.isValid = false;
        validation.errors.push('Audio file is required');
      }

      // Check for slides
      if (!presentation.slides || presentation.slides.length === 0) {
        validation.warnings.push('No slides uploaded - analysis will be limited');
      }

      // Check presentation metadata
      if (!presentation.title || presentation.title.trim() === '') {
        validation.warnings.push('Presentation title is empty');
      }

      return validation;
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Validation failed: ' + error.message]
      };
    }
  }

  /**
   * Get presentation by ID with full details
   * @param {number} presentationId 
   * @param {number} userId - For access control
   * @param {string} userRole - Optional role for permission check
   * @returns {Promise<object>}
   */
  async getPresentationById(presentationId, userId, userRole = null) {
    try {
      const presentation = await Presentation.findByPk(presentationId, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['userId', 'fullName', 'email']
          },
          {
            model: Topic,
            as: 'topic',
            attributes: ['topicId', 'title', 'courseId']
          },
          {
            model: Course,
            as: 'course',
            attributes: ['courseId', 'courseName']
          },
          {
            model: Slide,
            as: 'slides',
            attributes: ['slideId', 'slideNumber', 'fileName', 'filePath']
          },
          {
            model: AudioRecord,
            as: 'audioRecord',
            attributes: ['audioId', 'fileName', 'filePath', 'durationSeconds']
          }
        ]
      });

      if (!presentation) {
        return { success: false, message: 'Presentation not found' };
      }

      // Access control
      const hasAccess = await this.checkPresentationAccess(presentationId, userId, userRole);
      if (!hasAccess) {
        return { success: false, message: 'Access denied' };
      }

      return { success: true, presentation };
    } catch (error) {
      console.error('Get presentation error:', error);
      return { success: false, message: 'Failed to get presentation', error: error.message };
    }
  }

  /**
   * Get all presentations for a student
   * @param {number} studentId 
   * @param {object} options - {status, limit, offset}
   * @returns {Promise<object>}
   */
  async getAllPresentations(studentId, options = {}) {
    try {
      const { status, limit = 50, offset = 0 } = options;

      const where = { studentId };
      if (status) {
        where.status = status;
      }

      const presentations = await Presentation.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Topic,
            as: 'topic',
            attributes: ['topicId', 'title']
          },
          {
            model: AudioRecord,
            as: 'audioRecord',
            attributes: ['audioId', 'durationSeconds']
          }
        ]
      });

      return {
        success: true,
        presentations: presentations.rows,
        total: presentations.count,
        limit,
        offset
      };
    } catch (error) {
      console.error('Get all presentations error:', error);
      return { success: false, message: 'Failed to get presentations', error: error.message };
    }
  }

  /**
   * Update presentation
   * @param {number} presentationId 
   * @param {number} studentId 
   * @param {object} updates - {title, description}
   * @returns {Promise<object>}
   */
  async updatePresentation(presentationId, studentId, updates) {
    try {
      const accessResult = await this.getPresentationForStudent(presentationId, studentId);
      if (!accessResult.success) {
        return accessResult;
      }

      const allowedFields = ['title', 'description', 'groupCode'];
      const updateData = {};

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = updates[key];
        }
      });

      await Presentation.update(updateData, {
        where: { presentationId, studentId }
      });

      const presentation = await Presentation.findByPk(presentationId);

      return { success: true, presentation };
    } catch (error) {
      console.error('Update presentation error:', error);
      return { success: false, message: 'Failed to update presentation', error: error.message };
    }
  }

  /**
   * Delete presentation and all related data
   * @param {number} presentationId 
   * @param {number} studentId 
   * @returns {Promise<object>}
   */
  async deletePresentation(presentationId, studentId) {
    const transaction = await db.sequelize.transaction();

    try {
      const accessResult = await this.getPresentationForStudent(presentationId, studentId);
      if (!accessResult.success) {
        await transaction.rollback();
        return accessResult;
      }

      const presentation = accessResult.presentation;

      // Get file URLs for deletion
      const slides = await Slide.findAll({
        where: { presentationId },
        attributes: ['filePath']
      });

      const audioRecord = await AudioRecord.findOne({
        where: { presentationId },
        attributes: ['filePath']
      });

      // Delete from database (cascade will handle related records)
      await Presentation.destroy({
        where: { presentationId },
        transaction
      });

      await transaction.commit();

      // Delete files from S3 (async, don't wait)
      const filesToDelete = [];
      slides.forEach(slide => {
        const key = storageService.extractKeyFromUrl(slide.filePath);
        if (key) filesToDelete.push(key);
      });

      if (audioRecord) {
        const key = storageService.extractKeyFromUrl(audioRecord.filePath);
        if (key) filesToDelete.push(key);
      }

      if (filesToDelete.length > 0) {
        storageService.deleteMultipleFiles(filesToDelete).catch(error => {
          console.error('Error deleting files from S3:', error);
        });
      }

      console.log(`✅ Deleted presentation ${presentationId}`);

      return { success: true, message: 'Presentation deleted successfully' };
    } catch (error) {
      await transaction.rollback();
      console.error('Delete presentation error:', error);
      return { success: false, message: 'Failed to delete presentation', error: error.message };
    }
  }

  /**
   * Get processing status for presentation
   * @param {number} presentationId 
   * @param {number} userId 
   * @returns {Promise<object>}
   */
  async getProcessingStatus(presentationId, userId) {
    try {
      // Check access
      const hasAccess = await this.checkPresentationAccess(presentationId, userId);
      if (!hasAccess) {
        return { success: false, message: 'Access denied' };
      }

      const presentation = await Presentation.findByPk(presentationId, {
        attributes: ['presentationId', 'title', 'status', 'submittedAt']
      });

      if (!presentation) {
        return { success: false, message: 'Presentation not found' };
      }

      // Get all jobs for this presentation
      const jobs = await jobService.getJobHistory(presentationId);

      // Get job statistics
      const stats = await jobService.getJobStatistics(presentationId);

      // Get current/latest job for each type
      const asrJob = await jobService.getJobByPresentation(presentationId, 'asr');
      const analysisJob = await jobService.getJobByPresentation(presentationId, 'analysis');
      const reportJob = await jobService.getJobByPresentation(presentationId, 'report');

      const pipeline = {
        asr: asrJob ? {
          status: asrJob.status,
          startedAt: asrJob.startedAt,
          completedAt: asrJob.completedAt,
          error: asrJob.errorMessage
        } : null,
        analysis: analysisJob ? {
          status: analysisJob.status,
          startedAt: analysisJob.startedAt,
          completedAt: analysisJob.completedAt,
          error: analysisJob.errorMessage
        } : null,
        report: reportJob ? {
          status: reportJob.status,
          startedAt: reportJob.startedAt,
          completedAt: reportJob.completedAt,
          error: reportJob.errorMessage
        } : null
      };

      return {
        success: true,
        status: {
          presentationStatus: presentation.status,
          submittedAt: presentation.submittedAt,
          pipeline,
          jobs: jobs.length,
          statistics: stats
        }
      };
    } catch (error) {
      console.error('Get processing status error:', error);
      return { success: false, message: 'Failed to get processing status', error: error.message };
    }
  }

  /**
   * Get analysis results for presentation
   * @param {number} presentationId 
   * @param {number} userId 
   * @returns {Promise<object>}
   */
  async getAnalysisResults(presentationId, userId) {
    try {
      // Check access
      const hasAccess = await this.checkPresentationAccess(presentationId, userId);
      if (!hasAccess) {
        return { success: false, message: 'Access denied' };
      }

      const presentation = await Presentation.findByPk(presentationId, {
        include: [
          {
            model: Transcript,
            as: 'transcript',
            include: [{
              model: TranscriptSegment,
              as: 'segments',
              include: [{
                model: Speaker,
                as: 'speaker',
                include: [{
                  model: User,
                  as: 'mappedStudent',
                  attributes: ['userId', 'fullName']
                }]
              }]
            }]
          },
          {
            model: Speaker,
            as: 'speakers',
            include: [{
              model: User,
              as: 'mappedStudent',
              attributes: ['userId', 'fullName']
            }]
          },
          {
            model: Feedback,
            as: 'feedbacks'
          },
          {
            model: AnalysisResult,
            as: 'analysisResults'
          }
        ]
      });

      if (!presentation) {
        return { success: false, message: 'Presentation not found' };
      }

      // Get speaker statistics
      const speakerStats = presentation.speakers.length > 0
        ? await speakerService.getSpeakerStatistics(presentationId)
        : null;

      return {
        success: true,
        results: {
          presentationId,
          status: presentation.status,
          transcript: presentation.transcript,
          speakers: presentation.speakers,
          speakerStatistics: speakerStats,
          feedback: presentation.feedbacks,
          analysisResults: presentation.analysisResults
        }
      };
    } catch (error) {
      console.error('Get analysis results error:', error);
      return { success: false, message: 'Failed to get analysis results', error: error.message };
    }
  }

  /**
   * Check if user has access to presentation
   * @param {number} presentationId 
   * @param {number} userId 
   * @param {string} userRole 
   * @returns {Promise<boolean>}
   */
  async checkPresentationAccess(presentationId, userId, userRole = null) {
    try {
      const presentation = await Presentation.findByPk(presentationId);

      if (!presentation) {
        return false;
      }

      // Owner always has access
      if (presentation.studentId === userId) {
        return true;
      }

      // Admin/Teacher can access all
      if (userRole === 'admin' || userRole === 'teacher') {
        return true;
      }

      // Check if user is enrolled in same course
      if (presentation.courseId) {
        const enrollment = await TopicEnrollment.findOne({
          where: {
            studentId: userId,
            status: 'enrolled'
          },
          include: [{
            model: Topic,
            as: 'topic',
            where: { courseId: presentation.courseId }
          }]
        });

        if (enrollment) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Check access error:', error);
      return false;
    }
  }

  /**
   * Get presentations by course (for teachers)
   * @param {number} courseId 
   * @param {object} options 
   * @returns {Promise<object>}
   */
  async getPresentationsByCourse(courseId, options = {}) {
    try {
      const { status, limit = 50, offset = 0 } = options;

      const where = { courseId };
      if (status) {
        where.status = status;
      }

      const presentations = await Presentation.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['userId', 'fullName', 'email']
          },
          {
            model: Topic,
            as: 'topic',
            attributes: ['topicId', 'title']
          }
        ]
      });

      return {
        success: true,
        presentations: presentations.rows,
        total: presentations.count,
        limit,
        offset
      };
    } catch (error) {
      console.error('Get presentations by course error:', error);
      return { success: false, message: 'Failed to get presentations', error: error.message };
    }
  }
}

export default new PresentationService();
