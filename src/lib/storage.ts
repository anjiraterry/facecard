import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Neon Object Storage Client
 * S3-compatible object storage that branches with Lakebase Postgres
 * Requires path-style addressing (forcePathStyle: true)
 */
export const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export const BUCKET_NAME = process.env.NEON_BUCKET_NAME || "selfies";

export async function getPresignedUploadUrl(
  key: string,
  contentType: string = "image/jpeg",
  expiresInSeconds: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3.send(command);
}
