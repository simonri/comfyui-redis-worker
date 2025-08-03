export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
}

export interface ConfigParameters {
  comfyuiApiUrl: string;
  completeWebhookUrl: string;
  workflowApiUrl: string;
  redisUrl: string;
  queueName: string;
  jobName: string;
  maxRetries: number;
  pollIntervalSec: number;
  s3: S3Config;
  comfyuiOutputPath?: string;
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
  private readonly s3: S3Config;
  private readonly comfyuiOutputPath: string;

  constructor(params: ConfigParameters) {
    this.comfyuiApiUrl = params.comfyuiApiUrl;
    this.completeWebhookUrl = params.completeWebhookUrl;
    this.workflowApiUrl = params.workflowApiUrl;
    this.redisUrl = params.redisUrl;
    this.queueName = params.queueName;
    this.jobName = params.jobName;
    this.maxRetries = params.maxRetries;
    this.pollIntervalSec = params.pollIntervalSec;
    this.s3 = params.s3;
    this.comfyuiOutputPath = params.comfyuiOutputPath || '/comfyui/output';
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

  getS3() {
    return this.s3;
  }

  getCompleteWebhookUrl() {
    return this.completeWebhookUrl;
  }

  getWorkflowApiUrl() {
    return this.workflowApiUrl;
  }

  getComfyuiOutputPath() {
    return this.comfyuiOutputPath;
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
    s3: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      bucket: process.env.S3_BUCKET || "",
      endpoint: process.env.S3_ENDPOINT || "",
    },
    comfyuiOutputPath: process.env.COMFYUI_OUTPUT_PATH,
  });

  return config;
}