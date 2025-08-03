import { S3Client } from "bun";
import type { S3Config } from "./config";

export function getS3Client(config: S3Config) {
  const s3Client = new S3Client({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: config.endpoint,
    bucket: config.bucket,
  });

  return s3Client;
}