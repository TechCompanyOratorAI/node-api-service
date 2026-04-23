/**
 * Share Service - Quản lý chia sẻ bài thuyết trình
 *
 * Hai loại chia sẻ:
 * 1. PUBLIC  : tạo một share token duy nhất cho bài presentation, ai có link đều xem được
 * 2. PRIVATE : mời cụ thể bằng email, tạo share token riêng per-user, chỉ user đó dùng được
 *
 * Data trả về khi view qua share link: toàn bộ presentation (slides, media) + AI report
 */

import crypto from 'crypto';
import db from '../models/index.js';
import emailService from './emailService.js';

const {
  Presentation,
  PresentationAccess,
  User,
  Slide,
  AudioRecord,
  Topic,
  Course,
  AIReport,
  Feedback,
  Class,
  Transcript,
  TranscriptSegment,
  Speaker,
} = db;

/** Generate a url-safe random token */
const generateToken = () => crypto.randomBytes(48).toString('base64url');

class ShareService {
  // ─────────────────────────────────────────────────
  // SHARE: Create public link
  // ─────────────────────────────────────────────────

  /**
   * Tạo hoặc lấy public share link cho presentation
   * Một bài chỉ có TỐI ĐA 1 public share record
   *
   * @param {number} presentationId
   * @param {number} ownerId - userId của người share (phải là owner)
   * @param {object} options - { expiresAt }
   */
  async createPublicShare(presentationId, ownerId, options = {}) {
    try {
      const presentation = await Presentation.findOne({
        where: { presentationId, studentId: ownerId },
      });

      if (!presentation) {
        return { success: false, message: 'Presentation not found or access denied' };
      }

      const { expiresAt } = options;

      // Upsert: nếu đã có public share thì return ngay (hoặc refresh token nếu cần)
      const [accessRecord, created] = await PresentationAccess.findOrCreate({
        where: { presentationId, shareType: 'public', userId: null },
        defaults: {
          presentationId,
          userId: null,
          accessLevel: 'view',
          shareType: 'public',
          shareToken: generateToken(),
          grantedBy: ownerId,
          grantedAt: new Date(),
          expiresAt: expiresAt || null,
        },
      });

      const shareUrl = this._buildShareUrl(accessRecord.shareToken);

      return {
        success: true,
        message: created ? 'Public share link created' : 'Public share link already exists',
        shareToken: accessRecord.shareToken,
        shareUrl,
        shareType: 'public',
        expiresAt: accessRecord.expiresAt,
        accessId: accessRecord.accessId,
      };
    } catch (error) {
      console.error('Create public share error:', error);
      return { success: false, message: 'Failed to create public share', error: error.message };
    }
  }

  // ─────────────────────────────────────────────────
  // SHARE: Invite by email (private)
  // ─────────────────────────────────────────────────

  /**
   * Mời người dùng cụ thể bằng email xem presentation
   *
   * @param {number} presentationId
   * @param {number} ownerId
   * @param {string[]} emails - Danh sách email cần mời
   * @param {object} options - { expiresAt }
   */
  async inviteByEmails(presentationId, ownerId, emails, options = {}) {
    try {
      const presentation = await Presentation.findOne({
        where: { presentationId, studentId: ownerId },
        include: [{ model: User, as: 'student', attributes: ['userId', 'firstName', 'lastName'] }],
      });

      if (!presentation) {
        return { success: false, message: 'Presentation not found or access denied' };
      }

      const { expiresAt } = options;
      const senderName = presentation.student
        ? `${presentation.student.firstName} ${presentation.student.lastName}`.trim()
        : 'Ai đó';
      const results = [];

      for (const email of emails) {
        const normalizedEmail = email.toLowerCase().trim();

        // Tìm user theo email (có thể chưa có tài khoản - vẫn tạo record)
        const user = await User.findOne({ where: { email: normalizedEmail } });

        if (!user) {
          results.push({
            email: normalizedEmail,
            success: false,
            message: 'User with this email not found in the system',
          });
          continue;
        }

        // Không tự share cho chính mình
        if (user.userId === ownerId) {
          results.push({
            email: normalizedEmail,
            success: false,
            message: 'Cannot share with yourself',
          });
          continue;
        }

        // Upsert per-user private share
        const [accessRecord, created] = await PresentationAccess.findOrCreate({
          where: { presentationId, shareType: 'private', userId: user.userId },
          defaults: {
            presentationId,
            userId: user.userId,
            accessLevel: 'view',
            shareType: 'private',
            shareToken: generateToken(),
            grantedBy: ownerId,
            grantedAt: new Date(),
            expiresAt: expiresAt || null,
          },
        });

        if (!created && !accessRecord.shareToken) {
          // Bổ sung token nếu cũ chưa có
          await accessRecord.update({ shareToken: generateToken(), grantedBy: ownerId, expiresAt: expiresAt || null });
        }

        await accessRecord.reload();

        const shareUrl = this._buildShareUrl(accessRecord.shareToken);

        // Send invite email (async, don't block response)
        emailService.sendShareInviteEmail(
          normalizedEmail,
          `${user.firstName} ${user.lastName}`.trim() || normalizedEmail,
          senderName,
          presentation.title,
          shareUrl,
          expiresAt || null
        ).then(emailResult => {
          if (emailResult.success) {
            console.log(`✉️ Share invite email sent to ${normalizedEmail}`);
          } else {
            console.warn(`⚠️ Failed to send share invite email to ${normalizedEmail}:`, emailResult.error);
          }
        }).catch(err => {
          console.error(`❌ Error sending share invite email to ${normalizedEmail}:`, err.message);
        });

        results.push({
          email: normalizedEmail,
          userId: user.userId,
          success: true,
          message: created ? 'Invited successfully' : 'Already shared, refreshed token',
          shareToken: accessRecord.shareToken,
          shareUrl,
          expiresAt: accessRecord.expiresAt,
          accessId: accessRecord.accessId,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      return {
        success: true,
        message: `${successCount}/${emails.length} invite(s) processed`,
        results,
      };
    } catch (error) {
      console.error('Invite by emails error:', error);
      return { success: false, message: 'Failed to invite', error: error.message };
    }
  }

  // ─────────────────────────────────────────────────
  // SHARE: Revoke
  // ─────────────────────────────────────────────────

  /**
   * Thu hồi public share link
   */
  async revokePublicShare(presentationId, ownerId) {
    try {
      const presentation = await Presentation.findOne({
        where: { presentationId, studentId: ownerId },
      });
      if (!presentation) {
        return { success: false, message: 'Presentation not found or access denied' };
      }

      const deleted = await PresentationAccess.destroy({
        where: { presentationId, shareType: 'public', userId: null },
      });

      return {
        success: true,
        message: deleted ? 'Public share revoked' : 'No public share found to revoke',
        deleted,
      };
    } catch (error) {
      console.error('Revoke public share error:', error);
      return { success: false, message: 'Failed to revoke share', error: error.message };
    }
  }

  /**
   * Thu hồi quyền truy cập theo accessId
   */
  async revokePrivateShare(presentationId, ownerId, accessId) {
    try {
      const presentation = await Presentation.findOne({
        where: { presentationId, studentId: ownerId },
      });
      if (!presentation) {
        return { success: false, message: 'Presentation not found or access denied' };
      }

      const deleted = await PresentationAccess.destroy({
        where: { accessId, presentationId, shareType: 'private' },
      });

      return {
        success: true,
        message: deleted ? 'Access revoked' : 'No matching access record found',
        deleted,
      };
    } catch (error) {
      console.error('Revoke private share error:', error);
      return { success: false, message: 'Failed to revoke access', error: error.message };
    }
  }

  // ─────────────────────────────────────────────────
  // SHARE: List shares for a presentation
  // ─────────────────────────────────────────────────

  /**
   * Lấy danh sách tất cả người đang được share
   */
  async getShareList(presentationId, ownerId) {
    try {
      const presentation = await Presentation.findOne({
        where: { presentationId, studentId: ownerId },
      });
      if (!presentation) {
        return { success: false, message: 'Presentation not found or access denied' };
      }

      const accessList = await PresentationAccess.findAll({
        where: { presentationId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
            required: false,
          },
        ],
        order: [['grantedAt', 'DESC']],
      });

      const shares = accessList.map((a) => ({
        accessId: a.accessId,
        shareType: a.shareType,
        shareToken: a.shareToken,
        shareUrl: a.shareToken ? this._buildShareUrl(a.shareToken) : null,
        accessLevel: a.accessLevel,
        expiresAt: a.expiresAt,
        grantedAt: a.grantedAt,
        user: a.user || null,
      }));

      return { success: true, presentationId, shares };
    } catch (error) {
      console.error('Get share list error:', error);
      return { success: false, message: 'Failed to get share list', error: error.message };
    }
  }

  // ─────────────────────────────────────────────────
  // ACCESS: Validate share token
  // ─────────────────────────────────────────────────

  /**
   * Validate share token và trả về thông tin access record
   * Dùng trong middleware để bypass auth cho shared routes
   *
   * @param {string} token
   * @returns {{ valid: boolean, accessRecord?, presentationId?, reason? }}
   */
  async validateShareToken(token) {
    try {
      if (!token) return { valid: false, reason: 'No token provided' };

      const accessRecord = await PresentationAccess.findOne({
        where: { shareToken: token },
      });

      if (!accessRecord) {
        return { valid: false, reason: 'Invalid or expired share token' };
      }

      // Check expiry
      if (accessRecord.expiresAt && new Date() > new Date(accessRecord.expiresAt)) {
        return { valid: false, reason: 'Share link has expired' };
      }

      return {
        valid: true,
        accessRecord,
        presentationId: accessRecord.presentationId,
        shareType: accessRecord.shareType,
        accessLevel: accessRecord.accessLevel,
      };
    } catch (error) {
      console.error('Validate share token error:', error);
      return { valid: false, reason: 'Token validation error' };
    }
  }

  // ─────────────────────────────────────────────────
  // DATA: Get shared presentation data
  // ─────────────────────────────────────────────────

  /**
   * Lấy toàn bộ dữ liệu bài thuyết trình để hiển thị cho người xem qua share link
   * Bao gồm: presentation info, slides, media, AI report
   *
   * @param {number} presentationId
   */
  async getSharedPresentationData(presentationId) {
    try {
      // Presentation với slides, audio, topic, course
      const presentation = await Presentation.findByPk(presentationId, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['userId', 'firstName', 'lastName'],
          },
          {
            model: Topic,
            as: 'topic',
            attributes: ['topicId', 'topicName'],
          },
          {
            model: Course,
            as: 'course',
            attributes: ['courseId', 'courseName'],
          },
          {
            model: Class,
            as: 'class',
            attributes: ['classId', 'classCode'],
          },
          {
            model: Slide,
            as: 'slides',
            attributes: ['slideId', 'slideNumber', 'fileName', 'filePath', 'fileFormat'],
          },
          {
            model: AudioRecord,
            as: 'audioRecord',
            attributes: ['audioId', 'fileName', 'filePath', 'durationSeconds', 'fileFormat'],
          },
          {
            model: Transcript,
            as: 'transcript',
            attributes: [
              'transcriptId',
              'presentationId',
              'audioId',
              'fullTranscript',
              'language',
              'confidenceScore',
              'generatedAt',
            ],
            include: [
              {
                model: TranscriptSegment,
                as: 'segments',
                attributes: [
                  'segmentId',
                  'transcriptId',
                  'speakerId',
                  'segmentNumber',
                  'segmentText',
                  'startTimestamp',
                  'endTimestamp',
                  'confidenceScore',
                ],
                include: [
                  {
                    model: Speaker,
                    as: 'speaker',
                    attributes: [
                      'speakerId',
                      'aiSpeakerLabel',
                      'isMapped',
                      'totalDurationSeconds',
                      'segmentCount',
                    ],
                    required: false,
                    include: [
                      {
                        model: User,
                        as: 'mappedStudent',
                        attributes: ['userId', 'firstName', 'lastName'],
                        required: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!presentation) {
        return { success: false, message: 'Presentation not found' };
      }

      // AI report (nếu có)
      let aiReport = null;
      if (AIReport) {
        aiReport = await AIReport.findOne({
          where: { presentationId },
          include: [
            {
              model: User,
              as: 'confirmer',
              attributes: ['userId', 'firstName', 'lastName'],
              required: false,
            },
            {
              model: Feedback,
              as: 'instructorFeedback',
              required: false,
              include: [
                {
                  model: User,
                  as: 'reviewer',
                  attributes: ['userId', 'firstName', 'lastName'],
                  required: false,
                },
              ],
            },
          ],
        });
      }

      return {
        success: true,
        data: {
          presentation,
          aiReport: aiReport || null,
        },
      };
    } catch (error) {
      console.error('Get shared presentation data error:', error);
      return { success: false, message: 'Failed to load presentation data', error: error.message };
    }
  }

  // ─────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────

  _buildShareUrl(token) {
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/share/${token}`;
  }
}

export default new ShareService();
