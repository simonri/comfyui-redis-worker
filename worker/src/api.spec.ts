import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkflowById, handleJobCompleted } from "./api";
import { loadConfig } from "./config";

describe("getWorkflowById", () => {
  const OLD_ENV = process.env;
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch as any;
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env = OLD_ENV;
  });

  it("throws if WORKFLOW_API_URL is not set", async () => {
    delete process.env.WORKFLOW_API_URL;
    const config = loadConfig();

    await expect(getWorkflowById("123", config)).rejects.toThrow();
  });

  it("fetches from the correct url", async () => {
    process.env.WORKFLOW_API_URL = "https://api.example.com";

    const fakeJson = {
      id: "123", name: "Test Workflow"
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(fakeJson)
    });

    const config = loadConfig();
    const result = await getWorkflowById("123", config);

    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/123");
    expect(result).toEqual(fakeJson);
  });

  it("throws if the response is not ok", async () => {
    process.env.WORKFLOW_API_URL = "https://api.example.com";

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn()
    });

    const config = loadConfig();
    await expect(getWorkflowById("123", config)).rejects.toThrow("Workflow not found");
  });
});

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

    mockUploadVideoToS3.mockResolvedValue("test.mp4");

    await handleJobCompleted("123", "test.mp4", config);

    expect(mockUploadVideoToS3).toHaveBeenCalledWith("test.mp4", "123", config);

    expect(mockFetch).toHaveBeenCalledWith(config.getCompleteWebhookUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        videoKey: "test.mp4"
      })
    });
  });
});