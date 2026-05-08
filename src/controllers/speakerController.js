/**
 * Speaker Controller - Manage speaker diarization and student mapping
 */

const _speakerServiceModule = require('../services/speakerService');
const speakerService = _speakerServiceModule.default || _speakerServiceModule;
const { emitSpeakerMappingEvent } = require('../websocket/emitters');

class SpeakerController {
    /**
     * GET /api/v1/speakers/presentation/:presentationId
     * Get all speakers for a presentation
     */
    async getSpeakersByPresentation(req, res) {
        try {
            const { presentationId } = req.params;
            const parsedPresentationId = parseInt(presentationId);

            if (Number.isNaN(parsedPresentationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'PresentationId phải là số'
                });
            }

            const { includeStudent, includeSegments, onlyMapped, onlyUnmapped } = req.query;

            const options = {
                includeStudent: includeStudent !== 'false',
                includeSegments: includeSegments === 'true',
                onlyMapped: onlyMapped === 'true',
                onlyUnmapped: onlyUnmapped === 'true'
            };

            const speakers = await speakerService.getSpeakersByPresentation(
                parsedPresentationId,
                options
            );

            return res.json({
                success: true,
                speakers
            });
        } catch (error) {
            console.error('Get speakers by presentation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/speakers/:speakerId
     * Get speaker by ID with full details
     */
    async getSpeakerById(req, res) {
        try {
            const { speakerId } = req.params;
            const parsedSpeakerId = parseInt(speakerId);

            if (Number.isNaN(parsedSpeakerId)) {
                return res.status(400).json({
                    success: false,
                    message: 'SpeakerId phải là số'
                });
            }

            const speaker = await speakerService.getSpeakerById(parsedSpeakerId);

            return res.json({
                success: true,
                speaker
            });
        } catch (error) {
            console.error('Get speaker by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/speakers/:speakerId/map
     * Map speaker to student
     */
    async mapSpeakerToStudent(req, res) {
        try {
            const { speakerId } = req.params;
            const { studentId } = req.body;

            const parsedSpeakerId = parseInt(speakerId);
            const parsedStudentId = parseInt(studentId);

            if (Number.isNaN(parsedSpeakerId)) {
                return res.status(400).json({
                    success: false,
                    message: 'SpeakerId phải là số'
                });
            }

            if (Number.isNaN(parsedStudentId)) {
                return res.status(400).json({
                    success: false,
                    message: 'StudentId phải là số'
                });
            }

            const speaker = await speakerService.mapSpeakerToStudent(
                parsedSpeakerId,
                parsedStudentId
            );

            await emitSpeakerMappingEvent("updated", {
                presentationId: speaker.presentationId,
                speakerId: speaker.speakerId,
                studentId: parsedStudentId,
                message: "Anh xa speaker vua duoc cap nhat",
            });

            return res.json({
                success: true,
                message: 'Đã ánh xạ speaker với sinh viên thành công',
                speaker
            });
        } catch (error) {
            console.error('Map speaker to student error:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/v1/speakers/:speakerId/unmap
     * Unmap speaker from student
     */
    async unmapSpeaker(req, res) {
        try {
            const { speakerId } = req.params;
            const parsedSpeakerId = parseInt(speakerId);

            if (Number.isNaN(parsedSpeakerId)) {
                return res.status(400).json({
                    success: false,
                    message: 'SpeakerId phải là số'
                });
            }

            const speaker = await speakerService.unmapSpeaker(parsedSpeakerId);

            await emitSpeakerMappingEvent("updated", {
                presentationId: speaker.presentationId,
                speakerId: speaker.speakerId,
                studentId: null,
                message: "Anh xa speaker vua duoc cap nhat",
            });

            return res.json({
                success: true,
                message: 'Speaker unmapped thành công',
                speaker
            });
        } catch (error) {
            console.error('Unmap speaker error:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/v1/speakers/batch-map
     * Batch map multiple speakers to students
     */
    async batchMapSpeakers(req, res) {
        try {
            const { mappings } = req.body;

            if (!Array.isArray(mappings) || mappings.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Danh sách mappings không hợp lệ hoặc đang rỗng'
                });
            }

            const results = await speakerService.batchMapSpeakers(mappings);

            const presentationIds = [...new Set(results.success.map((speaker) => speaker.presentationId).filter(Boolean))];
            await Promise.all(
                presentationIds.map((presentationId) =>
                    emitSpeakerMappingEvent("updated", {
                        presentationId,
                        mappingsApplied: results.success.length,
                        message: "Batch map speaker da duoc luu",
                    })
                )
            );

            return res.json({
                success: true,
                message: `Đã ánh xạ ${results.success.length} diễn giả, ${results.failed.length} thất bại`,
                results
            });
        } catch (error) {
            console.error('Batch map speakers error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/speakers/statistics/:presentationId
     * Get speaker statistics for presentation
     */
    async getSpeakerStatistics(req, res) {
        try {
            const { presentationId } = req.params;
            const parsedPresentationId = parseInt(presentationId);

            if (Number.isNaN(parsedPresentationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'PresentationId phải là số'
                });
            }

            const statistics = await speakerService.getSpeakerStatistics(parsedPresentationId);

            return res.json({
                success: true,
                statistics
            });
        } catch (error) {
            console.error('Get speaker statistics error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/speakers/student/:studentId/summary
     * Get student speaker summary across presentations
     */
    async getStudentSpeakerSummary(req, res) {
        try {
            const { studentId } = req.params;
            const parsedStudentId = parseInt(studentId);

            if (Number.isNaN(parsedStudentId)) {
                return res.status(400).json({
                    success: false,
                    message: 'StudentId phải là số'
                });
            }

            const summary = await speakerService.getStudentSpeakerSummary(parsedStudentId);

            return res.json({
                success: true,
                summary
            });
        } catch (error) {
            console.error('Get student speaker summary error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/speakers/presentation/:presentationId/group-members
     * Get group members for a presentation
     */
    async getGroupMembers(req, res) {
        try {
            const { presentationId } = req.params;
            const parsedPresentationId = parseInt(presentationId);

            if (Number.isNaN(parsedPresentationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'PresentationId phải là số'
                });
            }

            const members = await speakerService.getGroupMembersForPresentation(parsedPresentationId);

            return res.json({
                success: true,
                members
            });
        } catch (error) {
            console.error('Get group members error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/speakers/presentation/:presentationId/auto-map
     * Auto-map speakers to students based on speaking order
     */
    async autoMapSpeakers(req, res) {
        try {
            const { presentationId } = req.params;
            const parsedPresentationId = parseInt(presentationId);

            if (Number.isNaN(parsedPresentationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'PresentationId phải là số'
                });
            }

            const result = await speakerService.autoMapSpeakers(parsedPresentationId);

            if (result.mapped > 0) {
                await emitSpeakerMappingEvent("updated", {
                    presentationId: parsedPresentationId,
                    mappingsApplied: result.mapped,
                    message: "Anh xa speaker tu dong da duoc cap nhat",
                });
            }

            return res.json({
                success: true,
                message: `Đã tự động ánh xạ ${result.mapped} diễn giả`,
                result
            });
        } catch (error) {
            console.error('Auto-map speakers error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/speakers/presentation/:presentationId/suggestions
     * Get suggested student mappings based on enrollment
     */
    async suggestStudentMappings(req, res) {
        try {
            const { presentationId } = req.params;
            const parsedPresentationId = parseInt(presentationId);

            if (Number.isNaN(parsedPresentationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'PresentationId phải là số'
                });
            }

            const suggestions = await speakerService.suggestStudentMappings(parsedPresentationId);

            return res.json({
                success: true,
                suggestions
            });
        } catch (error) {
            console.error('Suggest student mappings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }

    /**
     * DELETE /api/v1/speakers/:speakerId
     * Delete speaker
     */
    async deleteSpeaker(req, res) {
        try {
            const { speakerId } = req.params;
            const parsedSpeakerId = parseInt(speakerId);

            if (Number.isNaN(parsedSpeakerId)) {
                return res.status(400).json({
                    success: false,
                    message: 'SpeakerId phải là số'
                });
            }

            await speakerService.deleteSpeaker(parsedSpeakerId);

            return res.json({
                success: true,
                message: 'Speaker đã xóa thành công'
            });
        } catch (error) {
            console.error('Delete speaker error:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new SpeakerController();
