import { Queue, Worker, type ConnectionOptions } from "bullmq";

import { env } from "../config/env";
import { processDeploymentJob, type DeploymentJobData } from "../services/deployments/runtime";

export const DEPLOYMENTS_QUEUE_NAME = "launchpad-deployments";

let queue: Queue<DeploymentJobData, unknown, "build"> | null = null;

function getQueueErrorMessage(error: Error) {
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

function createRedisConnection() {
  const url = new URL(env.REDIS_URL);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname ? Number(url.pathname.slice(1) || 0) : 0,
    maxRetriesPerRequest: null
  } satisfies ConnectionOptions;
}

function getDeploymentQueue() {
  if (!queue) {
    queue = new Queue<DeploymentJobData, unknown, "build">(DEPLOYMENTS_QUEUE_NAME, {
      connection: createRedisConnection()
    });
    queue.on("error", (error) => {
      console.error(`Deployment queue error: ${getQueueErrorMessage(error)}`);
    });
  }

  return queue;
}

export async function enqueueDeploymentJob(data: DeploymentJobData) {
  await getDeploymentQueue().add("build", data, {
    jobId: data.deploymentId,
    attempts: 1,
    removeOnComplete: 50,
    removeOnFail: 100
  });
}

export function createDeploymentWorker() {
  return new Worker<DeploymentJobData>(
    DEPLOYMENTS_QUEUE_NAME,
    async (job) => {
      await processDeploymentJob(job.data);
    },
    {
      connection: createRedisConnection(),
      concurrency: 1
    }
  );
}
