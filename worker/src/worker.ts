import { ComfyApi } from "./comfyui/client";
import { getWorkflowById, handleJobCompleted } from "./api";
import { Config } from "./config";
import type { HistoryEntry } from "./comfyui/types";
import { sleep } from "./utils";

function extractVideoPath(history: HistoryEntry): string {
  const node = history.outputs?.[4];
  if (!node?.images?.[0]) {
    throw new Error('No video output found in job results');
  }

  const video = node.images[0];
  if (!video.filename) {
    throw new Error('Video output missing filename');
  }

  return video.subfolder ? `${video.subfolder}/${video.filename}` : video.filename;
}

export async function processJob(jobId: string, config: Config): Promise<boolean> {
  console.log(`Processing job: ${jobId}`);

  const client = new ComfyApi(config.getComfyuiApiUrl());
  const workflow = await getWorkflowById(jobId, config);

  const job = await client.queuePrompt(workflow);
  if (!job) {
    throw new Error('Failed to queue prompt');
  }

  console.log(`Job queued with prompt ID: ${job.prompt_id}`);

  const maxRetries = config.getMaxRetries();
  const pollInterval = config.getPollIntervalSec() * 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxRetries} for job ${jobId}`);

    try {
      const history = await client.getHistory(job.prompt_id);

      if (history?.status?.completed) {
        const filePath = extractVideoPath(history);
        await handleJobCompleted(jobId, filePath, config);
        console.log(`Job ${jobId} completed successfully`);
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, config.getPollIntervalSec() * 1000));
    } catch (error) {
      console.error(`Error polling job ${jobId} on attempt ${attempt}:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }

    if (attempt < maxRetries) {
      await sleep(pollInterval);
    }
  }

  throw new Error(`Job ${jobId} timed out after ${maxRetries} attempts`);
}