import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Config } from "../src/config";
import { setupQueues, type JobData } from "../src/bullmq";
import { Queue } from "bullmq";
import { mockWebhooks } from "./mockApi";
import path from "path";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import nock from "nock";
import testWorkflow from "./test-workflow.json";
import fs from "fs";

const TEST_QUEUE_NAME = "test-queue";
const TEST_JOB_NAME = "test-job";

const redisUrl = "redis://localhost:6380";
const bucketName = "test-bucket";

describe("Worker E2E Tests", () => {
  let testQueue: Queue<JobData>;
  let webhook: nock.Scope;
  let getWebhookBody: () => any;

  beforeAll(async () => {
    const config = new Config({
      comfyuiApiUrl: "http://localhost:8188",
      completeWebhookUrl: "http://api.example.com/webhook",
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
    getWebhookBody = mocks.getWebhookBody;

    await testQueue.drain();
  });

  afterEach(async () => {
    nock.cleanAll();
  });

  it("should process job end-to-end", async () => {
    const image = fs.readFileSync(path.join(__dirname, "test-image.png"));
    const imageBase64 = image.toString("base64");

    await testQueue.add(TEST_JOB_NAME, {
      jobId: "123",
      workflow: testWorkflow,
      outputNode: "8",
      images: [
        {
          name: "input-image.png",
          imageBase64: imageBase64,
        },
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 4000));

    expect(webhook.isDone()).toBe(true);

    const webhookBody = getWebhookBody();
    expect(webhookBody).toBeDefined();
    expect(webhookBody).toEqual({
      jobId: "123",
      videoKey: expect.any(String),
    });
  });

  it("should process multiple jobs", async () => {
    const image = fs.readFileSync(path.join(__dirname, "test-image.png"));
    const imageBase64 = image.toString("base64");

    await testQueue.add(TEST_JOB_NAME, {
      jobId: "123",
      outputNode: "8",
      workflow: testWorkflow,
      images: [
        {
          name: "input-image.png",
          imageBase64: imageBase64,
        },
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(webhook.isDone()).toBe(true);

    const webhookBody1 = getWebhookBody();
    expect(webhookBody1).toBeDefined();
    expect(webhookBody1).toEqual({
      jobId: "123",
      videoKey: expect.any(String),
    });

    await testQueue.add(TEST_JOB_NAME, {
      jobId: "321",
      outputNode: "8",
      workflow: testWorkflow,
      images: [
        {
          name: "input-image.png",
          imageBase64: imageBase64,
        },
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(webhook.isDone()).toBe(true);

    const webhookBody2 = getWebhookBody();
    expect(webhookBody2).toBeDefined();
    expect(webhookBody2).toEqual({
      jobId: "321",
      videoKey: expect.any(String),
    });
  });
});