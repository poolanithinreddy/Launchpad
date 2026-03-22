import type { BuildLogLineDto, DeploymentStatus } from "@launchpad/types";
import { createClient } from "redis";

import { env } from "../../config/env";

const DEPLOYMENT_EVENTS_CHANNEL = "launchpad:deployment-events";

type DeploymentLogEvent = {
  type: "log-line";
  deploymentId: string;
  line: BuildLogLineDto;
};

type DeploymentStatusEvent = {
  type: "deployment-status";
  deploymentId: string;
  status: DeploymentStatus;
};

export type DeploymentRealtimeEvent = DeploymentLogEvent | DeploymentStatusEvent;

function createRedisClient(name: string, allowReconnect = true) {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 3_000,
      reconnectStrategy: allowReconnect
        ? (retries) => (retries < 3 ? Math.min(retries * 200, 2_000) : false)
        : false
    }
  });

  client.on("error", (error) => {
    console.error(`Deployment ${name} Redis client error:`, error);
  });

  return client;
}

type DeploymentRedisClient = ReturnType<typeof createRedisClient>;

let publisherClient: DeploymentRedisClient | null = null;
let publisherConnection: Promise<DeploymentRedisClient> | null = null;
let subscriberStarted = false;

async function getPublisherClient() {
  if (publisherClient?.isOpen) {
    return publisherClient;
  }

  if (!publisherConnection) {
    publisherConnection = (async () => {
      const client = createRedisClient("publisher");
      await client.connect();
      publisherClient = client;
      return client;
    })().finally(() => {
      publisherConnection = null;
    });
  }

  const client = await publisherConnection;
  return client;
}

export async function publishDeploymentEvent(event: DeploymentRealtimeEvent) {
  try {
    const client = await getPublisherClient();
    await client.publish(DEPLOYMENT_EVENTS_CHANNEL, JSON.stringify(event));
  } catch (error) {
    console.error("Failed to publish deployment event.", error);
  }
}

export async function startDeploymentEventSubscriber(
  onEvent: (event: DeploymentRealtimeEvent) => void
) {
  if (subscriberStarted) {
    return;
  }

  subscriberStarted = true;

  try {
    const subscriber = createRedisClient("subscriber", false);
    await subscriber.connect();
    await subscriber.subscribe(DEPLOYMENT_EVENTS_CHANNEL, (message) => {
      try {
        const event = JSON.parse(message) as DeploymentRealtimeEvent;
        onEvent(event);
      } catch (error) {
        console.error("Failed to parse deployment event payload.", error);
      }
    });
  } catch (error) {
    subscriberStarted = false;
    console.error("Failed to subscribe to deployment events.", error);
  }
}
