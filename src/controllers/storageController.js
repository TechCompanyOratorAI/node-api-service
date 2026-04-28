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
                    message: 'Dữ liệu không hợp lệ'
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
                message: 'Lỗi máy chủ nội bộ',
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
                    message: 'Dữ liệu không hợp lệ'
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
                message: 'Lỗi máy chủ nội bộ',
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
                    message: 'Dữ liệu không hợp lệ'
                });
            }

            const result = await storageService.deleteFile(key);

            return res.json({
                success: true,
                message: 'File đã xóa thành công',
                ...result
            });
        } catch (error) {
            console.error('Delete file error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
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
                    message: 'Có lỗi xảy ra'
                });
            }

            const results = await storageService.deleteMultipleFiles(keys);

            return res.json({
                success: true,
                message: `Đã xóa ${results.deletedCount} tệp`,
                ...results
            });
        } catch (error) {
            console.error('Delete multiple files error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ nội bộ',
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
                    message: 'Dữ liệu không hợp lệ'
                });
            }

            const key = storageService.extractKeyFromUrl(url);

            if (!key) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ'
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
                message: 'Lỗi máy chủ nội bộ',
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
                    message: 'Dữ liệu không hợp lệ'
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
                message: 'Lỗi máy chủ nội bộ',
                error: error.message
            });
        }
    }
}

export default new StorageController();
