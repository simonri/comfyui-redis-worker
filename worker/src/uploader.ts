import fs from "fs/promises";
import type { Config } from "./config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export async function uploadVideoToS3(filePath: string, destKey: string, config: Config) {
  const s3Config = config.getS3();

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
    endpoint: s3Config.endpoint,
    region: "auto",
  });

  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new Error("Provided path is not a file");
  }

  const fileStream = await fs.readFile(filePath);
  await s3Client.send(new PutObjectCommand({
    Bucket: config.getS3().bucket,
    Key: destKey,
    Body: fileStream,
    ContentType: "video/mp4",
  }));

  return destKey;
}