import { setupQueues } from "./bullmq";
import { loadConfig } from "./config";

async function main() {
  console.log("Starting worker");
  const config = loadConfig();

  setupQueues(config);
}

main();