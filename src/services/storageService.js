import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucketName = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-1';

const s3Client = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

const encodeKey = (key) => key.split('/').map(encodeURIComponent).join('/');

const buildPublicUrl = (key) => {
  const baseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
  const encodedKey = encodeKey(key);
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, '')}/${encodedKey}`;
  }
  return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`;
};

class StorageService {
  /**
   * Upload buffer to S3
   * @param {object} params
   * @param {string} params.key - S3 key (path)
   * @param {Buffer} params.body - File content
   * @param {string} params.contentType - MIME type
   * @returns {Promise<{bucket: string, key: string, url: string}>}
   */
  async uploadBuffer({ key, body, contentType }) {
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType
    });

    await s3Client.send(command);

    return {
      bucket: bucketName,
      key,
      url: buildPublicUrl(key)
    };
  }

  /**
   * Generate presigned URL for uploading file to S3
   * @param {object} params
   * @param {string} params.key - S3 key (path)
   * @param {string} params.contentType - MIME type
   * @param {number} params.expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @returns {Promise<{uploadUrl: string, key: string, fileUrl: string}>}
   */
  async getPresignedUploadUrl({ key, contentType, expiresIn = 3600 }) {
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      uploadUrl,
      key,
      fileUrl: buildPublicUrl(key)
    };
  }

  /**
   * Generate presigned URL for downloading file from S3
   * @param {string} key - S3 key (path)
   * @param {number} expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @param {string} filename - Optional filename for Content-Disposition header
   * @returns {Promise<string>} - Presigned download URL
   */
  async getPresignedDownloadUrl(key, expiresIn = 3600, filename = null) {
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const params = {
      Bucket: bucketName,
      Key: key
    };

    // Add Content-Disposition header if filename provided
    if (filename) {
      params.ResponseContentDisposition = `attachment; filename="${filename}"`;
    }

    const command = new GetObjectCommand(params);
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return downloadUrl;
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 key (path)
   * @returns {Promise<{deleted: boolean, key: string}>}
   */
  async deleteFile(key) {
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    await s3Client.send(command);

    return {
      deleted: true,
      key
    };
  }

  /**
   * Delete multiple files from S3
   * @param {string[]} keys - Array of S3 keys
   * @returns {Promise<{deletedCount: number, failed: string[]}>}
   */
  async deleteMultipleFiles(keys) {
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const results = {
      deletedCount: 0,
      failed: []
    };

    for (const key of keys) {
      try {
        await this.deleteFile(key);
        results.deletedCount++;
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
        results.failed.push(key);
      }
    }

    return results;
  }

  /**
   * Extract S3 key from URL
   * @param {string} url - S3 URL
   * @returns {string|null} - S3 key or null if invalid
   */
  extractKeyFromUrl(url) {
    if (!url) return null;

    try {
      // Handle custom base URL
      const baseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
      if (baseUrl && url.startsWith(baseUrl)) {
        return decodeURIComponent(url.replace(baseUrl, '').replace(/^\/+/, ''));
      }

      // Handle standard S3 URL format
      const s3Pattern = new RegExp(`https://${bucketName}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`);
      const match = url.match(s3Pattern);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }

      return null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} key - S3 key (path)
   * @returns {Promise<boolean>}
   */
  async fileExists(key) {
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      });
      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}

export default new StorageService();
