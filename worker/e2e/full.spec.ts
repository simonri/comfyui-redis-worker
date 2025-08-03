import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Config } from "../src/config";
import { setupQueues } from "../src/bullmq";
import { Queue } from "bullmq";
import { mockWebhooks } from "./mockApi";
import path from "path";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import nock from "nock";

const TEST_QUEUE_NAME = "test-queue";
const TEST_JOB_NAME = "test-job";

const redisUrl = "redis://localhost:6379";
const bucketName = "test-bucket";

describe("Worker E2E Tests", () => {
  let testQueue: Queue;
  let webhook: nock.Scope;
  let workflow: nock.Scope;
  let getWebhookBody: () => any;

  beforeAll(async () => {
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

    console.log("ComfyUI output path:", config.getComfyuiOutputPath());

    const { queue, worker } = setupQueues(config);
    testQueue = queue;
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await testQueue.drain();
    await testQueue.close();
  });

  beforeEach(async () => {
    const mocks = mockWebhooks();
    webhook = mocks.webhook;
    workflow = mocks.workflow;
    getWebhookBody = mocks.getWebhookBody;

    await testQueue.drain();
  });

  afterEach(async () => {
    nock.cleanAll();
  });

  it("should process job end-to-end", async () => {
    await testQueue.add(TEST_JOB_NAME, {
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

  it("should process multiple jobs", async () => {
    await testQueue.add(TEST_JOB_NAME, {
      jobId: "123",
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(webhook.isDone()).toBe(true);
    expect(workflow.isDone()).toBe(true);

    const webhookBody1 = getWebhookBody();
    expect(webhookBody1).toBeDefined();
    expect(webhookBody1).toEqual({
      jobId: "123",
      videoKey: expect.any(String),
    });

    await testQueue.add(TEST_JOB_NAME, {
      jobId: "321",
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(webhook.isDone()).toBe(true);
    expect(workflow.isDone()).toBe(true);

    const webhookBody2 = getWebhookBody();
    expect(webhookBody2).toBeDefined();
    expect(webhookBody2).toEqual({
      jobId: "321",
      videoKey: expect.any(String),
    });
  });
});