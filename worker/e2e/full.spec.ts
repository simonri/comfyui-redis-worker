import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Config } from "../src/config";
import { setupQueues } from "../src/bullmq";
import { Queue } from "bullmq";
import { mockWebhooks } from "./mockApi";
import path from "path";
import fs from "fs";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";

const TEST_QUEUE_NAME = "test-queue";
const TEST_JOB_NAME = "test-job";

const redisUrl = "redis://localhost:6379";
const bucketName = "test-bucket";

async function cleanComfyuiOutput(outputPath: string): Promise<void> {
  try {
    if (!fs.existsSync(outputPath)) {
      return;
    }

    const files = await fs.promises.readdir(outputPath);

    for (const file of files) {
      const filePath = path.join(outputPath, file);
      const stat = await fs.promises.stat(filePath);

      if (stat.isDirectory()) {
        await fs.promises.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(filePath);
      }
    }
  } catch (error) {
    console.warn(`Failed to clean ComfyUI output directory: ${error}`);
  }
}

describe("Worker E2E Tests", () => {
  let testQueue: Queue;
  const { webhook, workflow, getWebhookBody } = mockWebhooks();

  beforeEach(async () => {
    const config = new Config({
      comfyuiApiUrl: "http://localhost:8188",
      completeWebhookUrl: "http://api.example.com/webhook",
      workflowApiUrl: "http://api.example.com/workflow",
      redisUrl: redisUrl,
      queueName: TEST_QUEUE_NAME,
      jobName: TEST_JOB_NAME,
      maxRetries: 3,
      pollIntervalSec: 1,
      s3: {
        accessKeyId: "test",
        secretAccessKey: "test",
        bucket: bucketName,
        endpoint: "http://localhost:4566",
      },
      comfyuiOutputPath: path.join(__dirname, "..", "..", "comfyui-output"),
    });

    // Create bucket
    const s3Client = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: config.getS3().accessKeyId,
        secretAccessKey: config.getS3().secretAccessKey,
      },
      endpoint: config.getS3().endpoint,
      forcePathStyle: true,
    });
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));

    await cleanComfyuiOutput(config.getComfyuiOutputPath());

    console.log("ComfyUI output path:", config.getComfyuiOutputPath());

    const { queue, worker } = setupQueues(config);
    testQueue = queue;
    await worker.waitUntilReady();
  });

  afterEach(async () => {
    await testQueue.close();
  });

  it("should process job end-to-end", async () => {
    const job = await testQueue.add(TEST_JOB_NAME, {
      jobId: "123",
    });

    await new Promise((resolve) => setTimeout(resolve, 4000));

    expect(webhook.isDone()).toBe(true);
    expect(workflow.isDone()).toBe(true);

    const webhookBody = getWebhookBody();
    expect(webhookBody).toBeDefined();
    expect(webhookBody).toEqual({
      jobId: "123",
      videoKey: expect.any(String),
    });
  });
});