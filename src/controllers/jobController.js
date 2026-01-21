/**
 * Job Controller - Manage processing jobs
 */

const jobService = require('../services/jobService');

class JobController {
    /**
     * GET /api/v1/jobs/presentation/:presentationId
     * Get all jobs for a presentation
     */
    async getJobsByPresentation(req, res) {
        try {
            const { presentationId } = req.params;
            const parsedPresentationId = parseInt(presentationId);

            if (Number.isNaN(parsedPresentationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'presentationId must be a number'
                });
            }

            const { jobType } = req.query;

            const jobs = await jobService.getJobByPresentation(
                parsedPresentationId,
                jobType || null
            );

            return res.json({
                success: true,
                jobs: Array.isArray(jobs) ? jobs : (jobs ? [jobs] : [])
            });
        } catch (error) {
            console.error('Get jobs by presentation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/jobs/:jobId
     * Get job by ID
     */
    async getJobById(req, res) {
        try {
            const { jobId } = req.params;
            const parsedJobId = parseInt(jobId);

            if (Number.isNaN(parsedJobId)) {
                return res.status(400).json({
                    success: false,
                    message: 'jobId must be a number'
                });
            }

            const job = await jobService.getJobById(parsedJobId);

            return res.json({
                success: true,
                job
            });
        } catch (error) {
            console.error('Get job by ID error:', error);
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/v1/jobs/presentation/:presentationId/history
     * Get job history for presentation
     */
    async getJobHistory(req, res) {
        try {
            const { presentationId } = req.params;
            const parsedPresentationId = parseInt(presentationId);

            if (Number.isNaN(parsedPresentationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'presentationId must be a number'
                });
            }

            const history = await jobService.getJobHistory(parsedPresentationId);

            return res.json({
                success: true,
                history
            });
        } catch (error) {
            console.error('Get job history error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/jobs/pending
     * Get pending jobs
     */
    async getPendingJobs(req, res) {
        try {
            const { jobType, limit = 50 } = req.query;

            const jobs = await jobService.getPendingJobs(
                jobType || null,
                parseInt(limit)
            );

            return res.json({
                success: true,
                jobs
            });
        } catch (error) {
            console.error('Get pending jobs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/jobs/running
     * Get running jobs
     */
    async getRunningJobs(req, res) {
        try {
            const { jobType } = req.query;

            const jobs = await jobService.getRunningJobs(jobType || null);

            return res.json({
                success: true,
                jobs
            });
        } catch (error) {
            console.error('Get running jobs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * GET /api/v1/jobs/statistics
     * Get job statistics
     */
    async getJobStatistics(req, res) {
        try {
            const { presentationId } = req.query;
            const parsedPresentationId = presentationId ? parseInt(presentationId) : null;

            const statistics = await jobService.getJobStatistics(parsedPresentationId);

            return res.json({
                success: true,
                statistics
            });
        } catch (error) {
            console.error('Get job statistics error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/jobs/:jobId/retry
     * Retry a failed job
     */
    async retryJob(req, res) {
        try {
            const { jobId } = req.params;
            const parsedJobId = parseInt(jobId);

            if (Number.isNaN(parsedJobId)) {
                return res.status(400).json({
                    success: false,
                    message: 'jobId must be a number'
                });
            }

            const job = await jobService.retryFailedJob(parsedJobId);

            return res.json({
                success: true,
                message: 'Job retry initiated',
                job
            });
        } catch (error) {
            console.error('Retry job error:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/v1/jobs/cleanup
     * Cleanup old jobs (admin only)
     */
    async cleanupOldJobs(req, res) {
        try {
            const { daysOld = 30 } = req.body;

            const deletedCount = await jobService.cleanupOldJobs(parseInt(daysOld));

            return res.json({
                success: true,
                message: `Cleaned up ${deletedCount} old jobs`,
                deletedCount
            });
        } catch (error) {
            console.error('Cleanup old jobs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/jobs/reset-stuck
     * Reset stuck jobs (admin only)
     */
    async resetStuckJobs(req, res) {
        try {
            const { hoursStuck = 2 } = req.body;

            const resetCount = await jobService.resetStuckJobs(parseInt(hoursStuck));

            return res.json({
                success: true,
                message: `Reset ${resetCount} stuck jobs`,
                resetCount
            });
        } catch (error) {
            console.error('Reset stuck jobs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

export default new JobController();
