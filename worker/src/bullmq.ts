import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { processJob } from "./worker";
import { Config } from "./config";

interface JobData {
  jobId: string;
}

export function setupQueues(config: Config) {
  const connection = new Redis(config.getRedisUrl(), {
    maxRetriesPerRequest: null,
  });

  new Queue<JobData>(config.getQueueName(), { connection});

  new Worker<JobData>(
    config.getQueueName(),
    async (job) => {
      if (job.name === config.getJobName()) {
        await processJob(job.data.jobId, config);
      }
    },
    { connection }
  );
}
