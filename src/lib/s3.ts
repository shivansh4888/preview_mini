import { S3Client } from "@aws-sdk/client-s3";

/**
 * Creates an S3-compatible client configured for Zata.ai (or any S3-compatible endpoint).
 */
export function createS3Client(endpointUrl: string, accessKeyId: string, secretKey: string): S3Client {
  return new S3Client({
    endpoint: endpointUrl,
    region: "auto",
    credentials: {
      accessKeyId,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true, // Required for most S3-compatible providers
  });
}

/**
 * Determines whether an endpoint is configured for S3 mode (has accessKeyId + secretKey)
 * or generic HTTP mode (has only token).
 */
export function isS3Mode(endpoint: {
  accessKeyId: string;
  secretKey: string;
}): boolean {
  return Boolean(endpoint.accessKeyId && endpoint.secretKey);
}
