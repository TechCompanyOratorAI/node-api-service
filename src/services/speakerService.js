/**
 * Speaker Service - Quản lý speakers từ diarization và mapping với students
 * 
 * Chức năng:
 * - Tạo speakers từ kết quả diarization (AI labels: S1, S2, SPEAKER_00, etc.)
 * - Map AI speaker labels với student IDs thật
 * - Tính toán speaker statistics (duration, segment count, etc.)
 * - Query speakers theo presentation, unmapped speakers, etc.
 * 
 * Business Rule BR-01: AI-generated speaker IDs + user mapping
 */

const { Speaker, TranscriptSegment, User, Presentation } = require('../models');
const { Op } = require('sequelize');
const db = require('../models').sequelize;

class SpeakerService {
    /**
     * Tạo speakers từ diarization results
     * @param {number} presentationId 
     * @param {Array} diarizationData - Array of {aiSpeakerLabel, segments: [{startTime, endTime, text}]}
     * @returns {Promise<Speaker[]>}
     */
    async createSpeakersFromDiarization(presentationId, diarizationData) {
        const transaction = await db.transaction();
        
        try {
            // Validate presentation exists
            const presentation = await Presentation.findByPk(presentationId);
            if (!presentation) {
                throw new Error(`Presentation not found: ${presentationId}`);
            }

            const speakers = [];

            for (const speakerData of diarizationData) {
                const { aiSpeakerLabel, segments = [], metadata = {} } = speakerData;

                if (!aiSpeakerLabel) {
                    console.warn('⚠️ Missing aiSpeakerLabel in diarization data, skipping...');
                    continue;
                }

                // Calculate total duration and segment count
                const totalDurationSeconds = segments.reduce((sum, seg) => {
                    return sum + ((seg.endTime || 0) - (seg.startTime || 0));
                }, 0);

                const segmentCount = segments.length;

                // Check if speaker already exists
                let speaker = await Speaker.findOne({
                    where: {
                        presentationId,
                        aiSpeakerLabel
                    },
                    transaction
                });

                if (speaker) {
                    // Update existing speaker stats
                    await speaker.update({
                        totalDurationSeconds,
                        segmentCount,
                        metadata: {
                            ...speaker.metadata,
                            ...metadata,
                            lastUpdated: new Date().toISOString()
                        }
                    }, { transaction });
                    
                    console.log(`🔄 Updated speaker ${aiSpeakerLabel} for presentation ${presentationId}`);
                } else {
                    // Create new speaker
                    speaker = await Speaker.create({
                        presentationId,
                        aiSpeakerLabel,
                        studentId: null,
                        isMapped: false,
                        totalDurationSeconds,
                        segmentCount,
                        metadata: {
                            ...metadata,
                            createdFrom: 'diarization',
                            createdAt: new Date().toISOString()
                        }
                    }, { transaction });

                    console.log(`✅ Created speaker ${aiSpeakerLabel} for presentation ${presentationId}`);
                }

                speakers.push(speaker);
            }

            await transaction.commit();
            console.log(`✅ Processed ${speakers.length} speakers for presentation ${presentationId}`);
            
            return speakers;
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error creating speakers from diarization:', error);
            throw error;
        }
    }

    /**
     * Link transcript segments to speakers
     * @param {number} presentationId 
     * @param {Array} segmentSpeakerMappings - [{segmentId, aiSpeakerLabel}]
     * @returns {Promise<number>} - Number of segments updated
     */
    async linkSegmentsToSpeakers(presentationId, segmentSpeakerMappings) {
        const transaction = await db.transaction();
        
        try {
            // Get all speakers for this presentation
            const speakers = await Speaker.findAll({
                where: { presentationId },
                transaction
            });

            const speakerLabelMap = {};
            speakers.forEach(speaker => {
                speakerLabelMap[speaker.aiSpeakerLabel] = speaker.speakerId;
            });

            let updatedCount = 0;

            for (const mapping of segmentSpeakerMappings) {
                const { segmentId, aiSpeakerLabel } = mapping;
                const speakerId = speakerLabelMap[aiSpeakerLabel];

                if (!speakerId) {
                    console.warn(`⚠️ Speaker not found for label: ${aiSpeakerLabel}`);
                    continue;
                }

                const [affectedRows] = await TranscriptSegment.update(
                    { speakerId },
                    {
                        where: { segmentId },
                        transaction
                    }
                );

                updatedCount += affectedRows;
            }

            await transaction.commit();
            console.log(`✅ Linked ${updatedCount} segments to speakers for presentation ${presentationId}`);
            
            return updatedCount;
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error linking segments to speakers:', error);
            throw error;
        }
    }

    /**
     * Map AI speaker to real student
     * @param {number} speakerId 
     * @param {number} studentId 
     * @returns {Promise<Speaker>}
     */
    async mapSpeakerToStudent(speakerId, studentId) {
        try {
            const speaker = await Speaker.findByPk(speakerId);
            if (!speaker) {
                throw new Error(`Speaker not found: ${speakerId}`);
            }

            // Validate student exists
            const student = await User.findByPk(studentId);
            if (!student) {
                throw new Error(`Student not found: ${studentId}`);
            }

            // Check if student is already mapped to another speaker in same presentation
            const existingMapping = await Speaker.findOne({
                where: {
                    presentationId: speaker.presentationId,
                    studentId,
                    speakerId: { [Op.ne]: speakerId }
                }
            });

            if (existingMapping) {
                throw new Error(
                    `Student ${studentId} is already mapped to speaker ${existingMapping.aiSpeakerLabel} in this presentation`
                );
            }

            await speaker.mapToStudent(studentId);
            console.log(`✅ Mapped speaker ${speaker.aiSpeakerLabel} to student ${studentId}`);
            
            return speaker;
        } catch (error) {
            console.error('❌ Error mapping speaker to student:', error);
            throw error;
        }
    }

    /**
     * Unmap speaker from student
     * @param {number} speakerId 
     * @returns {Promise<Speaker>}
     */
    async unmapSpeaker(speakerId) {
        try {
            const speaker = await Speaker.findByPk(speakerId);
            if (!speaker) {
                throw new Error(`Speaker not found: ${speakerId}`);
            }

            await speaker.unmap();
            console.log(`✅ Unmapped speaker ${speaker.aiSpeakerLabel}`);
            
            return speaker;
        } catch (error) {
            console.error('❌ Error unmapping speaker:', error);
            throw error;
        }
    }

    /**
     * Batch map multiple speakers to students
     * @param {Array} mappings - [{speakerId, studentId}]
     * @returns {Promise<{success: Speaker[], failed: Array}>}
     */
    async batchMapSpeakers(mappings) {
        const results = {
            success: [],
            failed: []
        };

        for (const mapping of mappings) {
            try {
                const speaker = await this.mapSpeakerToStudent(mapping.speakerId, mapping.studentId);
                results.success.push(speaker);
            } catch (error) {
                results.failed.push({
                    ...mapping,
                    error: error.message
                });
            }
        }

        console.log(`✅ Batch mapping: ${results.success.length} success, ${results.failed.length} failed`);
        return results;
    }

    /**
     * Get speakers by presentation
     * @param {number} presentationId 
     * @param {object} options - {includeStudent, includeSegments, onlyMapped, onlyUnmapped}
     * @returns {Promise<Speaker[]>}
     */
    async getSpeakersByPresentation(presentationId, options = {}) {
        try {
            const {
                includeStudent = true,
                includeSegments = false,
                onlyMapped = false,
                onlyUnmapped = false
            } = options;

            const where = { presentationId };

            if (onlyMapped) {
                where.isMapped = true;
            } else if (onlyUnmapped) {
                where.isMapped = false;
            }

            const include = [];

            if (includeStudent) {
                include.push({
                    model: User,
                    as: 'mappedStudent',
                    attributes: ['userId', 'fullName', 'email']
                });
            }

            if (includeSegments) {
                include.push({
                    model: TranscriptSegment,
                    as: 'segments',
                    attributes: ['segmentId', 'startTimestamp', 'endTimestamp', 'text']
                });
            }

            const speakers = await Speaker.findAll({
                where,
                include,
                order: [['totalDurationSeconds', 'DESC']]
            });

            return speakers;
        } catch (error) {
            console.error('❌ Error getting speakers by presentation:', error);
            throw error;
        }
    }

    /**
     * Get unmapped speakers for presentation
     * @param {number} presentationId 
     * @returns {Promise<Speaker[]>}
     */
    async getUnmappedSpeakers(presentationId) {
        try {
            return await Speaker.findUnmapped(presentationId);
        } catch (error) {
            console.error('❌ Error getting unmapped speakers:', error);
            throw error;
        }
    }

    /**
     * Get speaker by ID with full details
     * @param {number} speakerId 
     * @returns {Promise<Speaker>}
     */
    async getSpeakerById(speakerId) {
        try {
            const speaker = await Speaker.findByPk(speakerId, {
                include: [
                    {
                        model: User,
                        as: 'mappedStudent',
                        attributes: ['userId', 'fullName', 'email']
                    },
                    {
                        model: Presentation,
                        as: 'presentation',
                        attributes: ['presentationId', 'title', 'status']
                    },
                    {
                        model: TranscriptSegment,
                        as: 'segments',
                        attributes: ['segmentId', 'startTimestamp', 'endTimestamp', 'text', 'order'],
                        order: [['order', 'ASC']]
                    }
                ]
            });

            if (!speaker) {
                throw new Error(`Speaker not found: ${speakerId}`);
            }

            return speaker;
        } catch (error) {
            console.error('❌ Error getting speaker by ID:', error);
            throw error;
        }
    }

    /**
     * Get speaker statistics for presentation
     * @param {number} presentationId 
     * @returns {Promise<object>}
     */
    async getSpeakerStatistics(presentationId) {
        try {
            const speakers = await Speaker.findAll({
                where: { presentationId },
                include: [{
                    model: User,
                    as: 'mappedStudent',
                    attributes: ['userId', 'fullName']
                }]
            });

            const totalSpeakers = speakers.length;
            const mappedSpeakers = speakers.filter(s => s.isMapped).length;
            const unmappedSpeakers = totalSpeakers - mappedSpeakers;

            const totalDuration = speakers.reduce((sum, s) => sum + s.totalDurationSeconds, 0);
            const totalSegments = speakers.reduce((sum, s) => sum + s.segmentCount, 0);

            const speakerBreakdown = speakers.map(speaker => ({
                speakerId: speaker.speakerId,
                aiSpeakerLabel: speaker.aiSpeakerLabel,
                studentName: speaker.mappedStudent?.fullName || 'Unmapped',
                isMapped: speaker.isMapped,
                totalDurationSeconds: speaker.totalDurationSeconds,
                segmentCount: speaker.segmentCount,
                percentage: totalDuration > 0 ? ((speaker.totalDurationSeconds / totalDuration) * 100).toFixed(2) : 0
            }));

            return {
                presentationId,
                totalSpeakers,
                mappedSpeakers,
                unmappedSpeakers,
                mappingProgress: totalSpeakers > 0 ? ((mappedSpeakers / totalSpeakers) * 100).toFixed(2) : 0,
                totalDurationSeconds: totalDuration,
                totalSegments,
                speakers: speakerBreakdown
            };
        } catch (error) {
            console.error('❌ Error getting speaker statistics:', error);
            throw error;
        }
    }

    /**
     * Update speaker stats from transcript segments
     * Recalculate duration and segment count from actual segments
     * @param {number} speakerId 
     * @returns {Promise<Speaker>}
     */
    async updateSpeakerStats(speakerId) {
        try {
            const speaker = await Speaker.findByPk(speakerId);
            if (!speaker) {
                throw new Error(`Speaker not found: ${speakerId}`);
            }

            const segments = await TranscriptSegment.findAll({
                where: { speakerId },
                attributes: ['startTimestamp', 'endTimestamp']
            });

            const totalDurationSeconds = segments.reduce((sum, seg) => {
                return sum + ((seg.endTimestamp || 0) - (seg.startTimestamp || 0));
            }, 0);

            const segmentCount = segments.length;

            await speaker.updateStats(totalDurationSeconds, segmentCount);
            console.log(`✅ Updated stats for speaker ${speaker.aiSpeakerLabel}: ${segmentCount} segments, ${totalDurationSeconds}s`);

            return speaker;
        } catch (error) {
            console.error('❌ Error updating speaker stats:', error);
            throw error;
        }
    }

    /**
     * Get all speakers for a student across presentations
     * @param {number} studentId 
     * @returns {Promise<Speaker[]>}
     */
    async getSpeakersByStudent(studentId) {
        try {
            return await Speaker.findByStudent(studentId, {
                include: [{
                    model: Presentation,
                    as: 'presentation',
                    attributes: ['presentationId', 'title', 'status', 'createdAt']
                }],
                order: [['createdAt', 'DESC']]
            });
        } catch (error) {
            console.error('❌ Error getting speakers by student:', error);
            throw error;
        }
    }

    /**
     * Get speaker performance summary for student
     * @param {number} studentId 
     * @returns {Promise<object>}
     */
    async getStudentSpeakerSummary(studentId) {
        try {
            const speakers = await Speaker.findByStudent(studentId, {
                include: [{
                    model: Presentation,
                    as: 'presentation',
                    attributes: ['presentationId', 'title', 'createdAt']
                }]
            });

            const totalPresentations = new Set(speakers.map(s => s.presentationId)).size;
            const totalDuration = speakers.reduce((sum, s) => sum + s.totalDurationSeconds, 0);
            const totalSegments = speakers.reduce((sum, s) => sum + s.segmentCount, 0);
            const avgDurationPerPresentation = totalPresentations > 0 ? totalDuration / totalPresentations : 0;

            return {
                studentId,
                totalPresentations,
                totalSpeakingTimeSeconds: totalDuration,
                totalSegments,
                averageSpeakingTimePerPresentation: avgDurationPerPresentation,
                presentations: speakers.map(s => ({
                    presentationId: s.presentationId,
                    title: s.presentation?.title,
                    aiSpeakerLabel: s.aiSpeakerLabel,
                    durationSeconds: s.totalDurationSeconds,
                    segmentCount: s.segmentCount,
                    date: s.presentation?.createdAt
                }))
            };
        } catch (error) {
            console.error('❌ Error getting student speaker summary:', error);
            throw error;
        }
    }

    /**
     * Delete speaker and unlink segments
     * @param {number} speakerId 
     * @returns {Promise<boolean>}
     */
    async deleteSpeaker(speakerId) {
        const transaction = await db.transaction();
        
        try {
            const speaker = await Speaker.findByPk(speakerId);
            if (!speaker) {
                throw new Error(`Speaker not found: ${speakerId}`);
            }

            // Unlink segments (set speakerId to null)
            await TranscriptSegment.update(
                { speakerId: null },
                {
                    where: { speakerId },
                    transaction
                }
            );

            // Delete speaker
            await speaker.destroy({ transaction });

            await transaction.commit();
            console.log(`✅ Deleted speaker ${speakerId}`);
            
            return true;
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error deleting speaker:', error);
            throw error;
        }
    }

    /**
     * Auto-suggest student mappings based on enrollment
     * Returns suggested mappings for unmapped speakers
     * @param {number} presentationId 
     * @returns {Promise<Array>}
     */
    async suggestStudentMappings(presentationId) {
        try {
            // Get presentation details
            const presentation = await Presentation.findByPk(presentationId, {
                include: [{
                    model: require('../models').Course,
                    as: 'course',
                    include: [{
                        model: require('../models').Enrollment,
                        as: 'enrollments',
                        include: [{
                            model: User,
                            as: 'student',
                            attributes: ['userId', 'fullName', 'email']
                        }]
                    }]
                }]
            });

            if (!presentation || !presentation.course) {
                return [];
            }

            // Get unmapped speakers
            const unmappedSpeakers = await this.getUnmappedSpeakers(presentationId);
            
            // Get enrolled students
            const enrolledStudents = presentation.course.enrollments
                .filter(e => e.student)
                .map(e => e.student);

            // Get already mapped students
            const mappedSpeakers = await Speaker.findAll({
                where: {
                    presentationId,
                    isMapped: true
                },
                attributes: ['studentId']
            });
            const mappedStudentIds = new Set(mappedSpeakers.map(s => s.studentId));

            // Filter available students (not yet mapped)
            const availableStudents = enrolledStudents.filter(
                student => !mappedStudentIds.has(student.userId)
            );

            // Simple suggestion: pair unmapped speakers with available students
            const suggestions = [];
            for (let i = 0; i < Math.min(unmappedSpeakers.length, availableStudents.length); i++) {
                suggestions.push({
                    speakerId: unmappedSpeakers[i].speakerId,
                    aiSpeakerLabel: unmappedSpeakers[i].aiSpeakerLabel,
                    suggestedStudent: {
                        userId: availableStudents[i].userId,
                        fullName: availableStudents[i].fullName,
                        email: availableStudents[i].email
                    },
                    confidence: 'low', // Simple matching, low confidence
                    reason: 'Enrolled in course'
                });
            }

            console.log(`💡 Generated ${suggestions.length} speaker-student mapping suggestions`);
            return suggestions;
        } catch (error) {
            console.error('❌ Error suggesting student mappings:', error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new SpeakerService();
