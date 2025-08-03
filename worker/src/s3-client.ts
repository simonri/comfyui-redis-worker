import { S3Client } from "@aws-sdk/client-s3";
import type { Config } from "./config";

export function getS3Client(config: Config) {
  const s3Client = new S3Client({
    credentials: {
      accessKeyId: config.getS3AccessKeyId(),
      secretAccessKey: config.getS3SecretAccessKey(),
    },
    region: 'auto',
    endpoint: config.getS3Endpoint(),
  });

  return s3Client;
}