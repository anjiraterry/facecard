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
export const ATELIER_PRODUCTS_BUCKET = process.env.ATELIER_PRODUCTS_BUCKET || "atelier-products";

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

export async function deleteObject(key: string, bucket: string = BUCKET_NAME): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await s3.send(command);
}

export function getPublicBucketObjectUrl(key: string, bucket: string = ATELIER_PRODUCTS_BUCKET): string {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || "").replace(/\/$/, "");
  if (!endpoint) {
    throw new Error("AWS_ENDPOINT_URL_S3 is not configured");
  }
  return `${endpoint}/${bucket}/${key.replace(/^\//, "")}`;
}

export async function uploadProductImage(params: {
  productSlug: string;
  filename: string;
  contentType: string;
  body: Uint8Array;
}): Promise<{ key: string; url: string }> {
  const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const key = `products/${params.productSlug}/${Date.now()}-${safeName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: ATELIER_PRODUCTS_BUCKET,
      Key: key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: getPublicBucketObjectUrl(key, ATELIER_PRODUCTS_BUCKET),
  };
}
