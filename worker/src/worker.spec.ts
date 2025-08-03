import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractVideoPath, processJob } from "./worker";
import { ComfyApi } from "./comfyui/client";
import { handleJobCompleted } from "./api";
import { Config } from "./config";
import { sleep } from "./utils";
import type { QueuePromptResponse, HistoryEntry } from "./comfyui/types";
import type { JobData } from "./bullmq";

vi.mock("./comfyui/client");
vi.mock("./api");
vi.mock("./utils");

const MockedComfyApi = vi.mocked(ComfyApi);
const mockedHandleJobCompleted = vi.mocked(handleJobCompleted);
const mockedSleep = vi.mocked(sleep);

describe("processJob", () => {
  let mockConfig: Config;
  let mockComfyApiInstance: any;
  let mockJobData: JobData;

  beforeEach(() => {
    mockConfig = {
      getComfyuiApiUrl: vi.fn().mockReturnValue("http://localhost:8188"),
      getMaxRetries: vi.fn().mockReturnValue(3),
      getPollIntervalSec: vi.fn().mockReturnValue(1),
      getComfyuiOutputPath: vi.fn().mockReturnValue("test-output-path"),
    } as any;

    mockJobData = {
      jobId: "test-job-123",
      workflow: { "1": { inputs: {}, class_type: "LoadImage" } },
      images: [{ name: "test.jpg", imageBase64: "base64data" }],
      outputNode: "4",
    };

    mockComfyApiInstance = {
      uploadImage: vi.fn().mockResolvedValue(true),
      queuePrompt: vi.fn(),
      getHistory: vi.fn(),
    };

    MockedComfyApi.mockImplementation(() => mockComfyApiInstance);
    mockedSleep.mockResolvedValue(undefined);
    mockedHandleJobCompleted.mockResolvedValue(undefined);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should successfully process a job", async () => {
    const mockQueueResponse: QueuePromptResponse = {
      prompt_id: "prompt-123",
      number: 1,
      node_errors: {},
    };
    const mockHistoryEntry: HistoryEntry = {
      prompt: {},
      status: { status_str: "success", completed: true, messages: [] },
      outputs: {
        "4": {
          images: [{ filename: "output_video.mp4", subfolder: "videos", type: "output" }],
        },
      },
    };

    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    mockComfyApiInstance.getHistory.mockResolvedValue(mockHistoryEntry);

    const result = await processJob(mockJobData, mockConfig);

    expect(result).toBe(true);
    expect(mockComfyApiInstance.uploadImage).toHaveBeenCalledWith("test.jpg", "base64data");
    expect(mockComfyApiInstance.queuePrompt).toHaveBeenCalledWith(mockJobData.workflow);
    expect(mockComfyApiInstance.getHistory).toHaveBeenCalledWith("prompt-123");
    expect(mockedHandleJobCompleted).toHaveBeenCalledWith(
      "test-job-123",
      "test-output-path/videos/output_video.mp4",
      mockConfig
    );
  });

  it("should upload multiple images", async () => {
    const jobWithMultipleImages = {
      ...mockJobData,
      images: [
        { name: "image1.jpg", imageBase64: "base64data1" },
        { name: "image2.jpg", imageBase64: "base64data2" }
      ]
    };

    mockComfyApiInstance.queuePrompt.mockResolvedValue({ prompt_id: "prompt-123", number: 1, node_errors: {} });
    mockComfyApiInstance.getHistory.mockResolvedValue({
      status: { completed: true },
      outputs: { "4": { images: [{ filename: "test.mp4", subfolder: "", type: "output" }] } }
    });

    await processJob(jobWithMultipleImages, mockConfig);

    expect(mockComfyApiInstance.uploadImage).toHaveBeenCalledTimes(2);
    expect(mockComfyApiInstance.uploadImage).toHaveBeenCalledWith("image1.jpg", "base64data1");
    expect(mockComfyApiInstance.uploadImage).toHaveBeenCalledWith("image2.jpg", "base64data2");
  });

  it("should throw error when queuePrompt fails", async () => {
    mockComfyApiInstance.queuePrompt.mockResolvedValue(null);

    await expect(processJob(mockJobData, mockConfig)).rejects.toThrow("Failed to queue prompt");
    expect(mockComfyApiInstance.uploadImage).toHaveBeenCalled();
    expect(mockComfyApiInstance.getHistory).not.toHaveBeenCalled();
  });

  it("should throw error when max retries exceeded", async () => {
    mockComfyApiInstance.queuePrompt.mockResolvedValue({ prompt_id: "prompt-123", number: 1, node_errors: {} });
    mockComfyApiInstance.getHistory.mockResolvedValue({
      status: { status_str: "running", completed: false, messages: [] },
      outputs: {},
    });

    await expect(processJob(mockJobData, mockConfig)).rejects.toThrow(
      "Job test-job-123 timed out after 3 attempts"
    );
    expect(mockComfyApiInstance.getHistory).toHaveBeenCalledTimes(3);
  });

  it("should handle undefined history and continue polling", async () => {
    mockComfyApiInstance.queuePrompt.mockResolvedValue({ prompt_id: "prompt-123", number: 1, node_errors: {} });
    mockComfyApiInstance.getHistory
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue({
        status: { completed: true },
        outputs: { "4": { images: [{ filename: "test.mp4", subfolder: "", type: "output" }] } }
      });

    const result = await processJob(mockJobData, mockConfig);

    expect(result).toBe(true);
    expect(mockComfyApiInstance.getHistory).toHaveBeenCalledTimes(2);
  });

  it("should propagate upload errors", async () => {
    mockComfyApiInstance.uploadImage.mockRejectedValue(new Error("Upload failed"));

    await expect(processJob(mockJobData, mockConfig)).rejects.toThrow("Upload failed");
    expect(mockComfyApiInstance.queuePrompt).not.toHaveBeenCalled();
  });

  it("should propagate handleJobCompleted errors", async () => {
    mockComfyApiInstance.queuePrompt.mockResolvedValue({ prompt_id: "prompt-123", number: 1, node_errors: {} });
    mockComfyApiInstance.getHistory.mockResolvedValue({
      status: { completed: true },
      outputs: { "4": { images: [{ filename: "test.mp4", subfolder: "", type: "output" }] } }
    });
    mockedHandleJobCompleted.mockRejectedValue(new Error("S3 upload failed"));

    await expect(processJob(mockJobData, mockConfig)).rejects.toThrow("S3 upload failed");
  });
});

describe("extractVideoPath", () => {
  it("should extract video path with subfolder", () => {
    const history: HistoryEntry = {
      prompt: {},
      status: { status_str: "success", completed: true, messages: [] },
      outputs: {
        "4": {
          images: [{ filename: "output.mp4", subfolder: "videos", type: "output" }],
        },
      },
    };

    const result = extractVideoPath(history, "test-output-path", "4");
    expect(result).toBe("test-output-path/videos/output.mp4");
  });

  it("should extract video path without subfolder", () => {
    const history: HistoryEntry = {
      prompt: {},
      status: { status_str: "success", completed: true, messages: [] },
      outputs: {
        "4": {
          images: [{ filename: "output.mp4", subfolder: "", type: "output" }],
        },
      },
    };

    const result = extractVideoPath(history, "test-output-path", "4");
    expect(result).toBe("test-output-path/output.mp4");
  });

  it("should throw error when no node 4 found", () => {
    const history: HistoryEntry = {
      prompt: {},
      status: { status_str: "success", completed: true, messages: [] },
      outputs: {},
    };

    expect(() => extractVideoPath(history, "test-output-path", "4")).toThrow("No video output found in job results");
  });

  it("should throw error when no images in node 4", () => {
    const history: HistoryEntry = {
      prompt: {},
      status: { status_str: "success", completed: true, messages: [] },
      outputs: {
        "4": { width: [1920], height: [1080] },
      },
    };

    expect(() => extractVideoPath(history, "test-output-path", "4")).toThrow("No video output found in job results");
  });

  it("should throw error when no filename", () => {
    const history: HistoryEntry = {
      prompt: {},
      status: { status_str: "success", completed: true, messages: [] },
      outputs: {
        "4": {
          images: [{ subfolder: "videos", type: "output" } as any],
        },
      },
    };

    expect(() => extractVideoPath(history, "test-output-path", "4")).toThrow("Video output missing filename");
  });
});