import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "./config";
import { uploadVideoToS3 } from "./uploader";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import os from "os";
import { mockClient } from "aws-sdk-client-mock";

const rootDir = path.resolve(os.tmpdir(), "worker-test-root");
const s3Mock = mockClient(S3Client);

afterEach(() => s3Mock.reset());

describe("uploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }
  });

  it("should upload a video to s3", async () => {
    const testFileContent = "test";
    const filePath = path.resolve(rootDir, "test.mp4");
    fs.writeFileSync(filePath, testFileContent, "utf8");

    const destKey = "test.mp4";
    s3Mock.on(PutObjectCommand).resolves({});

    const config = loadConfig();
    const result = await uploadVideoToS3(filePath, destKey, config);

    expect(result).toBe(destKey);

    const call = s3Mock.commandCalls(PutObjectCommand)[0];
    expect(call?.args[0].input).toMatchObject({
      Bucket: config.getS3().bucket,
      Key: destKey,
      Body: Buffer.from(testFileContent),
      ContentType: "video/mp4",
    });
  });
});