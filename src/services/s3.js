const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;
const SIGNED_URL_EXPIRY = parseInt(process.env.SIGNED_URL_EXPIRY || "300", 10);

/**
 * Upload a file buffer to S3.
 * @returns {string} The S3 object key
 */
async function uploadFile(key, buffer, contentType = "application/javascript") {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return key;
}

/**
 * Generate a time-limited presigned URL for a private S3 object.
 */
async function getPresignedUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: SIGNED_URL_EXPIRY });
}

/**
 * Delete an object from S3.
 */
async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadFile, getPresignedUrl, deleteFile };
