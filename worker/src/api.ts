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

export async function getWorkflowById(id: string, config: Config): Promise<Workflow> {
  const url = `${config.getWorkflowApiUrl()}/${id}`;
  console.log("Getting workflow from:", url);
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (response.status === 404) {
    throw new Error("Workflow not found");
  }
  return response.json() as Promise<Workflow>;
}

export async function handleJobCompleted(jobId: string, filePath: string, config: Config) {
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