import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { processJob } from "./worker";
import { Config } from "./config";

interface ImageInput {
  name: string;
  imageBase64: string;
}

export interface JobData {
  jobId: string;
  outputNode: string;
  workflow: {
    [key: string]: any;
  };
  images: ImageInput[];
}

export function setupQueues(config: Config) {
  const connection = new Redis(config.getRedisUrl(), {
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 20000,
    commandTimeout: 15000,
    keepAlive: 30000,
    password: config.getRedisPassword(),
  });

  const queue = new Queue<JobData>(config.getQueueName(), { connection});

  const worker = new Worker<JobData>(
    config.getQueueName(),
    async (job) => {
      if (job.name === config.getJobName()) {
        await processJob(job.data, config);
      }
    },
    {
      connection,
      concurrency: 1,
      removeOnComplete: 100,
      removeOnFail: 50,
      settings: {
        stalledInterval: 30000,  // Check for stalled jobs every 30s
        maxStalledCount: 1,      // Mark as stalled after 1 check
      }
     }
  );

  return { queue, worker };
}
