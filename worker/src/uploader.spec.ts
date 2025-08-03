import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "./config";
import { uploadVideoToS3 } from "./uploader";
import fs from "fs";
import path from "path";
import os from "os";

const rootDir = path.resolve(os.tmpdir(), "worker-test-root");

vi.mock("./s3-client", () => {
  const mockWrite = vi.fn();
  const mockFile = vi.fn().mockReturnValue({
    write: mockWrite
  });
  const mockS3Client = {
    file: mockFile
  };

  return {
    getS3Client: vi.fn().mockReturnValue(mockS3Client)
  };
});

describe("uploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }
  });

  it("should upload a video to s3", async () => {
    const filePath = path.resolve(rootDir, "test.mp4");
    fs.writeFileSync(filePath, "test", "utf8");

    const destKey = "test.txt";

    const config = loadConfig();
    const result = await uploadVideoToS3(filePath, destKey, config);

    const { getS3Client } = await import("./s3-client");
    const mockS3Client = (getS3Client as any)();

    expect(mockS3Client.file).toHaveBeenCalledWith(destKey);
    expect(mockS3Client.file().write).toHaveBeenCalledWith(
      Buffer.from("test"),
      {
        type: "video/mp4",
      }
    );

    expect(result).toBe(destKey);
  });
});