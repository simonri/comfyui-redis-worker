import { S3Client } from "bun";
import type { Config } from "./config";

export function getS3Client(config: Config) {
  const s3Client = new S3Client({
    accessKeyId: config.getS3AccessKeyId(),
    secretAccessKey: config.getS3SecretAccessKey(),
    bucket: config.getS3Bucket(),
    endpoint: config.getS3Endpoint(),
  });

  return s3Client;
}