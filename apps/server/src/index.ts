import { createServer } from "http";

import { env } from "./config/env";
import { createApp } from "./app";
import { connectToMongo } from "./lib/mongoose";
import { initializeSocketServer } from "./lib/socket";
import { startDeploymentEventSubscriber } from "./services/deployments/events";

async function startServer() {
  await connectToMongo();

  const app = createApp();
  const httpServer = createServer(app);
  const io = initializeSocketServer(httpServer);

  await startDeploymentEventSubscriber((event) => {
    if (event.type === "log-line") {
      io.to(event.deploymentId).emit("log-line", {
        deploymentId: event.deploymentId,
        line: event.line
      });
      return;
    }

    io.to(event.deploymentId).emit("deployment-status", {
      deploymentId: event.deploymentId,
      status: event.status
    });
  });

  httpServer.listen(env.PORT, () => {
    console.log(`Launchpad server listening on http://localhost:${env.PORT}`);
  });
}

void startServer();
