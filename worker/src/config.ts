export interface ConfigParameters {
  comfyuiApiUrl: string;
  completeWebhookUrl: string;
  workflowApiUrl: string;
  redisUrl: string;
  queueName: string;
  jobName: string;
  maxRetries: number;
  pollIntervalSec: number;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Bucket: string;
  s3Endpoint: string;
}

export class Config {
  private readonly comfyuiApiUrl: string;
  private readonly completeWebhookUrl: string;
  private readonly workflowApiUrl: string;
  private readonly redisUrl: string;
  private readonly queueName: string;
  private readonly jobName: string;
  private readonly maxRetries: number;
  private readonly pollIntervalSec: number;
  private readonly s3AccessKeyId: string;
  private readonly s3SecretAccessKey: string;
  private readonly s3Bucket: string;
  private readonly s3Endpoint: string;

  constructor(params: ConfigParameters) {
    this.comfyuiApiUrl = params.comfyuiApiUrl;
    this.completeWebhookUrl = params.completeWebhookUrl;
    this.workflowApiUrl = params.workflowApiUrl;
    this.redisUrl = params.redisUrl;
    this.queueName = params.queueName;
    this.jobName = params.jobName;
    this.maxRetries = params.maxRetries;
    this.pollIntervalSec = params.pollIntervalSec;
    this.s3AccessKeyId = params.s3AccessKeyId;
    this.s3SecretAccessKey = params.s3SecretAccessKey;
    this.s3Bucket = params.s3Bucket;
    this.s3Endpoint = params.s3Endpoint;
  }

  getComfyuiApiUrl() {
    return this.comfyuiApiUrl;
  }

  getRedisUrl() {
    return this.redisUrl;
  }

  getQueueName() {
    return this.queueName;
  }

  getJobName() {
    return this.jobName;
  }

  getMaxRetries() {
    return this.maxRetries;
  }

  getPollIntervalSec() {
    return this.pollIntervalSec;
  }

  getS3AccessKeyId() {
    return this.s3AccessKeyId;
  }

  getS3SecretAccessKey() {
    return this.s3SecretAccessKey;
  }

  getS3Bucket() {
    return this.s3Bucket;
  }

  getS3Endpoint() {
    return this.s3Endpoint;
  }

  getCompleteWebhookUrl() {
    return this.completeWebhookUrl;
  }

  getWorkflowApiUrl() {
    return this.workflowApiUrl;
  }
}

export function loadConfig() {
  const config = new Config({
    comfyuiApiUrl: process.env.COMFYUI_API_URL || "",
    completeWebhookUrl: process.env.COMPLETE_WEBHOOK_URL || "",
    workflowApiUrl: process.env.WORKFLOW_API_URL || "",
    redisUrl: process.env.REDIS_URL || "",
    queueName: process.env.QUEUE_NAME || "",
    jobName: process.env.JOB_NAME || "",
    maxRetries: 60 * 20,
    pollIntervalSec: 1,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    s3Bucket: process.env.S3_BUCKET || "",
    s3Endpoint: process.env.S3_ENDPOINT || "",
  });

  return config;
}