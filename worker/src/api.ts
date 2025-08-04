import type { Config } from "./config";
import { uploadVideoToS3 } from "./uploader";
import { v4 as uuidv4 } from 'uuid';

export interface Workflow {
  id: string;
  outputNode: string;
  data: {
    [key: string]: any;
  };
}

export async function handleJobCompleted(jobId: string, filePath: string, config: Config) {
  console.log(`Handling job completed: ${jobId}, filePath: ${filePath}`);
  const destKey = `${uuidv4()}.mp4`;
  const s3Key = await uploadVideoToS3(filePath, destKey, config);

  const response = await fetch(config.getCompleteWebhookUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jobId,
      videoKey: s3Key,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark job as completed: ${response.status} ${response.statusText}`);
  }
}