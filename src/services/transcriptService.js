import db from '../models/index.js';

const {
    Transcript,
    TranscriptSegment,
    Speaker,
    Presentation,
    User,
    AudioRecord,
    TopicEnrollment,
    Topic,
    GroupStudent,
    Group
} = db;

class TranscriptService {
    /**
     * Kiểm tra quyền truy cập transcript của presentation
     * Đồng bộ với presentationService.checkPresentationAccess
     */
    async _checkAccess(presentationId, user) {
        const presentation = await Presentation.findByPk(presentationId, {
            attributes: ['presentationId', 'studentId', 'classId', 'courseId']
        });

        if (!presentation) {
            return { allowed: false, reason: 'Presentation not found' };
        }

        if (presentation.studentId === user.userId) {
            return { allowed: true, presentation };
        }

        const roleNames = [
            ...(user.userRoles || []).map((userRole) => userRole?.role?.roleName),
            user.role
        ]
            .map((roleName) => String(roleName || '').toLowerCase())
            .filter(Boolean);

        if (roleNames.some((role) => ['admin', 'teacher', 'instructor'].includes(role))) {
            return { allowed: true, presentation };
        }

        if (presentation.classId) {
            const ownerGroup = await GroupStudent.findOne({
                where: { studentId: presentation.studentId },
                include: [
                    {
                        model: Group,
                        as: 'group',
                        where: { classId: presentation.classId },
                        attributes: ['groupId']
                    }
                ]
            });

            if (ownerGroup?.group?.groupId) {
                const isMember = await GroupStudent.findOne({
                    where: {
                        studentId: user.userId,
                        groupId: ownerGroup.group.groupId
                    }
                });

                if (isMember) {
                    return { allowed: true, presentation };
                }
            }
        }

        if (presentation.courseId) {
            const enrollment = await TopicEnrollment.findOne({
                where: {
                    studentId: user.userId,
                    status: 'enrolled'
                },
                include: [
                    {
                        model: Topic,
                        as: 'topic',
                        where: { courseId: presentation.courseId }
                    }
                ]
            });

            if (enrollment) {
                return { allowed: true, presentation };
            }
        }

        return { allowed: false, reason: 'Access denied' };
    }

    /**
     * Lấy transcript đầy đủ theo presentationId (kèm segments và thông tin speaker)
     */
    async getTranscriptByPresentation(presentationId, user) {
        const { allowed, reason, presentation } = await this._checkAccess(presentationId, user);
        if (!allowed) return { success: false, message: reason, statusCode: reason === 'Presentation not found' ? 404 : 403 };

        const transcript = await Transcript.findOne({
            where: { presentationId },
            include: [
                {
                    model: AudioRecord,
                    as: 'audioRecord',
                    attributes: ['audioId', 'fileName', 'durationSeconds', 'fileFormat']
                },
                {
                    model: TranscriptSegment,
                    as: 'segments',
                    include: [
                        {
                            model: Speaker,
                            as: 'speaker',
                            include: [
                                {
                                    model: User,
                                    as: 'mappedStudent',
                                    attributes: ['userId', 'firstName', 'lastName']
                                }
                            ],
                            attributes: ['speakerId', 'aiSpeakerLabel', 'isMapped', 'totalDurationSeconds', 'segmentCount'],
                            required: false
                        }
                    ],
                    order: [['segmentNumber', 'ASC']]
                }
            ]
        });

        if (!transcript) {
            return { success: false, message: 'Không tìm thấy dữ liệu', statusCode: 404 };
        }

        return {
            success: true,
            message: 'Lấy transcript thành công',
            data: transcript,
            statusCode: 200
        };
    }

    /**
     * Lấy transcript theo transcriptId
     */
    async getTranscriptById(transcriptId, user) {
        const transcript = await Transcript.findByPk(transcriptId, {
            attributes: ['transcriptId', 'presentationId', 'audioId']
        });

        if (!transcript) {
            return { success: false, message: 'Transcript không tìm thấy', statusCode: 404 };
        }

        const { allowed, reason } = await this._checkAccess(transcript.presentationId, user);
        if (!allowed) return { success: false, message: reason, statusCode: 403 };

        const fullTranscript = await Transcript.findByPk(transcriptId, {
            include: [
                {
                    model: AudioRecord,
                    as: 'audioRecord',
                    attributes: ['audioId', 'fileName', 'durationSeconds', 'fileFormat']
                },
                {
                    model: TranscriptSegment,
                    as: 'segments',
                    include: [
                        {
                            model: Speaker,
                            as: 'speaker',
                            include: [
                                {
                                    model: User,
                                    as: 'mappedStudent',
                                    attributes: ['userId', 'firstName', 'lastName']
                                }
                            ],
                            attributes: ['speakerId', 'aiSpeakerLabel', 'isMapped', 'totalDurationSeconds', 'segmentCount'],
                            required: false
                        }
                    ],
                    order: [['segmentNumber', 'ASC']]
                }
            ]
        });

        return {
            success: true,
            message: 'Lấy transcript chi tiết thành công',
            data: fullTranscript,
            statusCode: 200
        };
    }

    /**
     * Lấy danh sách segments của transcript (có phân trang)
     */
    async getTranscriptSegments(transcriptId, user, { page = 1, limit = 50 } = {}) {
        const transcript = await Transcript.findByPk(transcriptId, {
            attributes: ['transcriptId', 'presentationId', 'fullTranscript', 'language', 'confidenceScore']
        });

        if (!transcript) {
            return { success: false, message: 'Transcript không tìm thấy', statusCode: 404 };
        }

        const { allowed, reason } = await this._checkAccess(transcript.presentationId, user);
        if (!allowed) return { success: false, message: reason, statusCode: 403 };

        const offset = (page - 1) * limit;

        const { count, rows: segments } = await TranscriptSegment.findAndCountAll({
            where: { transcriptId },
            include: [
                {
                    model: Speaker,
                    as: 'speaker',
                    include: [
                        {
                            model: User,
                            as: 'mappedStudent',
                            attributes: ['userId', 'firstName', 'lastName']
                        }
                    ],
                    attributes: ['speakerId', 'aiSpeakerLabel', 'isMapped'],
                    required: false
                }
            ],
            order: [['segmentNumber', 'ASC']],
            limit,
            offset
        });

        return {
            success: true,
            message: 'Lấy transcript segments thành công',
            data: {
                transcriptId: transcript.transcriptId,
                presentationId: transcript.presentationId,
                language: transcript.language,
                segments,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit)
                }
            },
            statusCode: 200
        };
    }
}

export default new TranscriptService();
