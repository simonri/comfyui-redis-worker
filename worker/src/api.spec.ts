import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleJobCompleted } from "./api";
import { loadConfig } from "./config";

const mockUploadVideoToS3 = vi.hoisted(() => vi.fn());

vi.mock("./uploader", () => ({
  uploadVideoToS3: mockUploadVideoToS3
}));

describe("handleJobCompleted", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("uploads the video to s3", async () => {
    const config = loadConfig();

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    });

    const expectedS3Key = "generated-uuid-key.mp4";
    mockUploadVideoToS3.mockResolvedValue(expectedS3Key);

    await handleJobCompleted("123", "test.mp4", config);

    expect(mockUploadVideoToS3).toHaveBeenCalledWith("test.mp4", expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.mp4$/), config);

    expect(mockFetch).toHaveBeenCalledWith(config.getCompleteWebhookUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jobId: "123",
        videoKey: expectedS3Key,
      })
    });
  });
});