import transcriptService from '../services/transcriptService.js';

class TranscriptController {
    async getByPresentation(req, res) {
        try {
            const presentationId = parseInt(req.params.presentationId);
            if (isNaN(presentationId)) {
                return res.status(400).json({ success: false, message: 'presentationId must be a number' });
            }

            const result = await transcriptService.getTranscriptByPresentation(presentationId, req.user);
            return res.status(result.statusCode).json({
                success: result.success,
                message: result.message,
                data: result.data ?? null
            });
        } catch (error) {
            console.error('getByPresentation error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const transcriptId = parseInt(req.params.transcriptId);
            if (isNaN(transcriptId)) {
                return res.status(400).json({ success: false, message: 'transcriptId must be a number' });
            }

            const result = await transcriptService.getTranscriptById(transcriptId, req.user);
            return res.status(result.statusCode).json({
                success: result.success,
                message: result.message,
                data: result.data ?? null
            });
        } catch (error) {
            console.error('getById error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getSegments(req, res) {
        try {
            const transcriptId = parseInt(req.params.transcriptId);
            if (isNaN(transcriptId)) {
                return res.status(400).json({ success: false, message: 'transcriptId must be a number' });
            }

            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

            const result = await transcriptService.getTranscriptSegments(transcriptId, req.user, { page, limit });
            return res.status(result.statusCode).json({
                success: result.success,
                message: result.message,
                data: result.data ?? null
            });
        } catch (error) {
            console.error('getSegments error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

export default new TranscriptController();
