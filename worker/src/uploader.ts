import fs from "fs/promises";
import type { Config } from "./config";
import { getS3Client } from "./s3-client";

export async function uploadVideoToS3(filePath: string, destKey: string, config: Config) {
  const s3Client = getS3Client(config);

  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new Error("Provided path is not a file");
  }

  const fileStream = await fs.readFile(filePath);
  const s3file = s3Client.file(destKey);

  await s3file.write(fileStream, {
    type: "video/mp4",
  });

  return destKey;
}