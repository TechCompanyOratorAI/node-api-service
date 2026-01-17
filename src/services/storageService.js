import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
}

export default new StorageService();
