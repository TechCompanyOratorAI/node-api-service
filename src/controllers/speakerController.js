/**
 * Speaker Controller - Manage speaker diarization and student mapping
 */

const speakerService = require('../services/speakerService');

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
                    message: 'presentationId must be a number'
                });
            }

            const { includeStudent, includeSegments, onlyMapped, onlyUnmapped } = req.query;

            const options = {
                includeStudent: includeStudent === 'true',
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
                message: 'Internal server error',
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
                    message: 'speakerId must be a number'
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
                message: 'Internal server error',
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
                    message: 'speakerId must be a number'
                });
            }

            if (Number.isNaN(parsedStudentId)) {
                return res.status(400).json({
                    success: false,
                    message: 'studentId must be a number'
                });
            }

            const speaker = await speakerService.mapSpeakerToStudent(
                parsedSpeakerId,
                parsedStudentId
            );

            return res.json({
                success: true,
                message: 'Speaker mapped to student successfully',
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
                    message: 'speakerId must be a number'
                });
            }

            const speaker = await speakerService.unmapSpeaker(parsedSpeakerId);

            return res.json({
                success: true,
                message: 'Speaker unmapped successfully',
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
                    message: 'mappings must be a non-empty array'
                });
            }

            const results = await speakerService.batchMapSpeakers(mappings);

            return res.json({
                success: true,
                message: `Mapped ${results.success.length} speakers, ${results.failed.length} failed`,
                results
            });
        } catch (error) {
            console.error('Batch map speakers error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
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
                    message: 'presentationId must be a number'
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
                message: 'Internal server error',
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
                    message: 'studentId must be a number'
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
                message: 'Internal server error',
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
                    message: 'presentationId must be a number'
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
                message: 'Internal server error',
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
                    message: 'speakerId must be a number'
                });
            }

            await speakerService.deleteSpeaker(parsedSpeakerId);

            return res.json({
                success: true,
                message: 'Speaker deleted successfully'
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
