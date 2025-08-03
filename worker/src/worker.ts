import { ComfyApi } from "./comfyui/client";
import { getWorkflowById, handleJobCompleted } from "./api";
import { Config } from "./config";

export async function processJob(jobId: string, config: Config): Promise<boolean> {
  console.log(`Processing ${jobId}`);
  const client = new ComfyApi(config.getComfyuiApiUrl());

  const workflow = await getWorkflowById(jobId);

  const job = await client.queuePrompt(workflow);
  if (!job) {
    throw new Error('Failed to queue prompt');
  }

  let retryCount = 0;

  while (retryCount < config.getMaxRetries()) {
    const history = await client.getHistory(job.prompt_id);

    if (history) {
      const status = history.status;

      if (status.completed) {
        const node = history.outputs[4];
        if (!node || !node.images) {
          throw new Error('No node found');
        }

        const video = node.images[0];
        if (!video) {
          throw new Error('No video found');
        }

        const filePath = `${video.subfolder}/${video.filename}`;

        await handleJobCompleted(jobId, filePath, config);
        return true;
      }
    }

    retryCount++;
    await new Promise(resolve => setTimeout(resolve, config.getPollIntervalSec() * 1000));
  }

  return false;
}