/**
 * Storage Controller - Manage file uploads and presigned URLs
 */

const storageService = require('../services/storageService');

class StorageController {
    /**
     * POST /api/v1/storage/presigned-upload
     * Generate presigned URL for file upload
     */
    async getPresignedUploadUrl(req, res) {
        try {
            const { key, contentType, expiresIn } = req.body;

            if (!key || !contentType) {
                return res.status(400).json({
                    success: false,
                    message: 'key and contentType are required'
                });
            }

            const result = await storageService.getPresignedUploadUrl({
                key,
                contentType,
                expiresIn: expiresIn ? parseInt(expiresIn) : 3600
            });

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Get presigned upload URL error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/storage/presigned-download
     * Generate presigned URL for file download
     */
    async getPresignedDownloadUrl(req, res) {
        try {
            const { key, expiresIn, filename } = req.body;

            if (!key) {
                return res.status(400).json({
                    success: false,
                    message: 'key is required'
                });
            }

            const downloadUrl = await storageService.getPresignedDownloadUrl(
                key,
                expiresIn ? parseInt(expiresIn) : 3600,
                filename || null
            );

            return res.json({
                success: true,
                downloadUrl,
                expiresIn: expiresIn || 3600
            });
        } catch (error) {
            console.error('Get presigned download URL error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * DELETE /api/v1/storage/file
     * Delete file from S3
     */
    async deleteFile(req, res) {
        try {
            const { key } = req.body;

            if (!key) {
                return res.status(400).json({
                    success: false,
                    message: 'key is required'
                });
            }

            const result = await storageService.deleteFile(key);

            return res.json({
                success: true,
                message: 'File deleted successfully',
                ...result
            });
        } catch (error) {
            console.error('Delete file error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/storage/delete-multiple
     * Delete multiple files from S3
     */
    async deleteMultipleFiles(req, res) {
        try {
            const { keys } = req.body;

            if (!Array.isArray(keys) || keys.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'keys must be a non-empty array'
                });
            }

            const results = await storageService.deleteMultipleFiles(keys);

            return res.json({
                success: true,
                message: `Deleted ${results.deletedCount} files`,
                ...results
            });
        } catch (error) {
            console.error('Delete multiple files error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/storage/extract-key
     * Extract S3 key from URL
     */
    async extractKeyFromUrl(req, res) {
        try {
            const { url } = req.body;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'url is required'
                });
            }

            const key = storageService.extractKeyFromUrl(url);

            if (!key) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid S3 URL or unable to extract key'
                });
            }

            return res.json({
                success: true,
                key
            });
        } catch (error) {
            console.error('Extract key from URL error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * POST /api/v1/storage/file-exists
     * Check if file exists in S3
     */
    async fileExists(req, res) {
        try {
            const { key } = req.body;

            if (!key) {
                return res.status(400).json({
                    success: false,
                    message: 'key is required'
                });
            }

            const exists = await storageService.fileExists(key);

            return res.json({
                success: true,
                exists,
                key
            });
        } catch (error) {
            console.error('File exists check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

export default new StorageController();
