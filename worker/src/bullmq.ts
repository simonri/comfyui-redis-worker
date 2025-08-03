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
    maxRetriesPerRequest: null,
  });

  const queue = new Queue<JobData>(config.getQueueName(), { connection});

  const worker = new Worker<JobData>(
    config.getQueueName(),
    async (job) => {
      if (job.name === config.getJobName()) {
        await processJob(job.data, config);
      }
    },
    { connection }
  );

  return { queue, worker };
}
