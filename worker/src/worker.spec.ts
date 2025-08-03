import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processJob } from "./worker";
import { ComfyApi } from "./comfyui/client";
import { getWorkflowById, handleJobCompleted } from "./api";
import { Config } from "./config";
import { sleep } from "./utils";
import type { QueuePromptResponse, HistoryEntry } from "./comfyui/types";

vi.mock("./comfyui/client");
vi.mock("./api");
vi.mock("./utils");

const MockedComfyApi = vi.mocked(ComfyApi);
const mockedGetWorkflowById = vi.mocked(getWorkflowById);
const mockedHandleJobCompleted = vi.mocked(handleJobCompleted);
const mockedSleep = vi.mocked(sleep);

describe("processJob", () => {
  let mockConfig: Config;
  let mockComfyApiInstance: any;

  beforeEach(() => {
    mockConfig = {
      getComfyuiApiUrl: vi.fn().mockReturnValue("http://localhost:8188"),
      getMaxRetries: vi.fn().mockReturnValue(3),
      getPollIntervalSec: vi.fn().mockReturnValue(1),
    } as any;

    mockComfyApiInstance = {
      queuePrompt: vi.fn(),
      getHistory: vi.fn(),
    };

    MockedComfyApi.mockImplementation(() => mockComfyApiInstance);
    mockedSleep.mockResolvedValue(undefined);

    vi.stubGlobal('setTimeout', (callback: () => void) => {
      callback();
      return 1;
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("should successfully process a job", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };
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
          images: [
            {
              filename: "output_video.mp4",
              subfolder: "videos",
              type: "output",
            },
          ],
        },
      },
    };

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    mockComfyApiInstance.getHistory.mockResolvedValue(mockHistoryEntry);
    mockedHandleJobCompleted.mockResolvedValue(undefined);

    const result = await processJob(jobId, mockConfig);

    expect(result).toBe(true);
    expect(mockedGetWorkflowById).toHaveBeenCalledWith(jobId, mockConfig);
    expect(MockedComfyApi).toHaveBeenCalledWith("http://localhost:8188");
    expect(mockComfyApiInstance.queuePrompt).toHaveBeenCalledWith(mockWorkflow);
    expect(mockComfyApiInstance.getHistory).toHaveBeenCalledWith("prompt-123");
    expect(mockedHandleJobCompleted).toHaveBeenCalledWith(
      jobId,
      "videos/output_video.mp4",
      mockConfig
    );
  });

  it("should throw error when queuePrompt returns null", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(null);

    await expect(processJob(jobId, mockConfig)).rejects.toThrow(
      "Failed to queue prompt"
    );

    expect(mockedGetWorkflowById).toHaveBeenCalledWith(jobId, mockConfig);
    expect(mockComfyApiInstance.queuePrompt).toHaveBeenCalledWith(mockWorkflow);
    expect(mockComfyApiInstance.getHistory).not.toHaveBeenCalled();
    expect(mockedHandleJobCompleted).not.toHaveBeenCalled();
  });

  it("should throw error when max retries exceeded", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };
    const mockQueueResponse: QueuePromptResponse = {
      prompt_id: "prompt-123",
      number: 1,
      node_errors: {},
    };

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    mockComfyApiInstance.getHistory.mockResolvedValue({
      prompt: {},
      status: { status_str: "running", completed: false, messages: [] },
      outputs: {},
    });

    await expect(processJob(jobId, mockConfig)).rejects.toThrow(
      `Job ${jobId} timed out after 3 attempts`
    );

    expect(mockComfyApiInstance.getHistory).toHaveBeenCalledTimes(3); // maxRetries
    expect(mockedHandleJobCompleted).not.toHaveBeenCalled();
  });

  it("should throw error when no node found in outputs", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };
    const mockQueueResponse: QueuePromptResponse = {
      prompt_id: "prompt-123",
      number: 1,
      node_errors: {},
    };
    const mockHistoryEntry: HistoryEntry = {
      prompt: {},
      status: { status_str: "success", completed: true, messages: [] },
      outputs: {}, // No node 4
    };

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    mockComfyApiInstance.getHistory.mockResolvedValue(mockHistoryEntry);

    await expect(processJob(jobId, mockConfig)).rejects.toThrow("No video output found");

    expect(mockedHandleJobCompleted).not.toHaveBeenCalled();
  });

  it("should throw error when node has no images", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };
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
          width: [1920],
          height: [1080],
          // No images array
        },
      },
    };

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    mockComfyApiInstance.getHistory.mockResolvedValue(mockHistoryEntry);

    await expect(processJob(jobId, mockConfig)).rejects.toThrow("No video output found");

    expect(mockedHandleJobCompleted).not.toHaveBeenCalled();
  });

  it("should throw error when no video found in images array", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };
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
          images: [], // Empty images array
        },
      },
    };

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    mockComfyApiInstance.getHistory.mockResolvedValue(mockHistoryEntry);

    await expect(processJob(jobId, mockConfig)).rejects.toThrow("No video output found");

    expect(mockedHandleJobCompleted).not.toHaveBeenCalled();
  });

  it("should handle history returning undefined and continue polling", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };
    const mockQueueResponse: QueuePromptResponse = {
      prompt_id: "prompt-123",
      number: 1,
      node_errors: {},
    };

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    // First two calls return undefined, then return completed job
    mockComfyApiInstance.getHistory
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue({
        prompt: {},
        status: { status_str: "success", completed: true, messages: [] },
        outputs: {
          "4": {
            images: [
              {
                filename: "output_video.mp4",
                subfolder: "videos",
                type: "output",
              },
            ],
          },
        },
      });
    mockedHandleJobCompleted.mockResolvedValue(undefined);

    const result = await processJob(jobId, mockConfig);

    expect(result).toBe(true);
    expect(mockComfyApiInstance.getHistory).toHaveBeenCalledTimes(3);
    expect(mockedHandleJobCompleted).toHaveBeenCalledWith(
      jobId,
      "videos/output_video.mp4",
      mockConfig
    );
  });

  it("should propagate errors from getWorkflowById", async () => {
    const jobId = "test-job-123";
    const error = new Error("Workflow not found");

    mockedGetWorkflowById.mockRejectedValue(error);

    await expect(processJob(jobId, mockConfig)).rejects.toThrow("Workflow not found");

    expect(MockedComfyApi).toHaveBeenCalledWith("http://localhost:8188");
    expect(mockComfyApiInstance.queuePrompt).not.toHaveBeenCalled();
  });

  it("should propagate errors from handleJobCompleted", async () => {
    const jobId = "test-job-123";
    const mockWorkflow = { id: "workflow-1", outputNode: "4", data: {} };
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
          images: [
            {
              filename: "output_video.mp4",
              subfolder: "videos",
              type: "output",
            },
          ],
        },
      },
    };
    const error = new Error("Failed to upload to S3");

    mockedGetWorkflowById.mockResolvedValue(mockWorkflow);
    mockComfyApiInstance.queuePrompt.mockResolvedValue(mockQueueResponse);
    mockComfyApiInstance.getHistory.mockResolvedValue(mockHistoryEntry);
    mockedHandleJobCompleted.mockRejectedValue(error);

    await expect(processJob(jobId, mockConfig)).rejects.toThrow("Failed to upload to S3");

    expect(mockedHandleJobCompleted).toHaveBeenCalledWith(
      jobId,
      "videos/output_video.mp4",
      mockConfig
    );
  });
});