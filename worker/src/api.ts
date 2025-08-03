import type { Config } from "./config";
import { uploadVideoToS3 } from "./uploader";

interface Workflow {
  id: string;
  outputNode: string;
  data: {
    [key: string]: any;
  };
}

export async function getWorkflowById(id: string, config: Config): Promise<Workflow> {
  const response = await fetch(`${config.getWorkflowApiUrl()}/${id}`);
  if (response.status === 404) {
    throw new Error("Workflow not found");
  }
  return response.json() as Promise<Workflow>;
}

export async function handleJobCompleted(jobId: string, filePath: string, config: Config) {
  const s3Key = await uploadVideoToS3(filePath, jobId, config);

  const response = await fetch(config.getCompleteWebhookUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      videoKey: s3Key,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark job as completed: ${response.status} ${response.statusText}`);
  }
}