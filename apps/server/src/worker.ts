import { createDeploymentWorker } from "./queues/deployments";

const worker = createDeploymentWorker();

function getWorkerErrorMessage(error: Error) {
  if (error instanceof AggregateError) {
    const message = error.errors
      .map((entry) => (entry instanceof Error ? entry.message : String(entry)))
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join("; ");

    if (message) {
      return message;
    }
  }

  const message = error.message.trim();
  return message || "Redis connection failed.";
}

worker.on("completed", (job) => {
  console.log(`Deployment job ${job.id} completed.`);
});

worker.on("failed", (job, error) => {
  console.error(`Deployment job ${job?.id ?? "unknown"} failed.`, error);
});

worker.on("error", (error) => {
  console.error(`Deployment worker error: ${getWorkerErrorMessage(error)}`);
});

console.log("Launchpad deployment worker listening for jobs.");

async function shutdown(signal: string) {
  console.log(`Shutting down deployment worker after ${signal}...`);
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
