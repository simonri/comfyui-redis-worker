import { ComfyApi } from "./comfyui/client";
import { handleJobCompleted } from "./api";
import { Config } from "./config";
import type { HistoryEntry } from "./comfyui/types";
import { sleep } from "./utils";
import type { JobData } from "./bullmq";

export function extractVideoPath(history: HistoryEntry, outputPath: string, outputNode: string): string {
  const node = history.outputs?.[outputNode];
  if (!node?.images?.[0]) {
    throw new Error('No video output found in job results');
  }

  const video = node.images[0];
  if (!video.filename) {
    throw new Error('Video output missing filename');
  }

  return video.subfolder ? `${outputPath}/${video.subfolder}/${video.filename}` : `${outputPath}/${video.filename}`;
}

/**
 * 1. Upload image to ComfyUI
 * 2. Queue prompt
 * 3. Poll for job completion
 * 4. Extract video path
 * 5. Upload video to S3
 * 6. Send webhook
 */
export async function processJob(job: JobData, config: Config): Promise<boolean> {

  console.log(`Processing job: ${job.jobId}`);

  const client = new ComfyApi(config.getComfyuiApiUrl());

  for (const image of job.images) {
    await client.uploadImage(image.name, image.imageBase64);
  }

  const comfyJob = await client.queuePrompt(job.workflow);
  if (!comfyJob) {
    throw new Error('Failed to queue prompt');
  }

  console.log(`Job queued with prompt ID: ${comfyJob.prompt_id}`);

  const maxRetries = config.getMaxRetries();
  const pollInterval = config.getPollIntervalSec() * 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxRetries} for job ${comfyJob.prompt_id}`);

    try {
      const history = await client.getHistory(comfyJob.prompt_id);

      if (history?.status?.completed) {
        const filePath = extractVideoPath(history, config.getComfyuiOutputPath(), job.outputNode);
        await handleJobCompleted(job.jobId, filePath, config);
        console.log(`Job ${job.jobId} completed successfully`);
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, config.getPollIntervalSec() * 1000));
    } catch (error) {
      console.error(`Error polling job ${job.jobId} on attempt ${attempt}:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }

    if (attempt < maxRetries) {
      await sleep(pollInterval);
    }
  }

  throw new Error(`Job ${job.jobId} timed out after ${maxRetries} attempts`);
}