import net from "net";

import { prisma } from "@launchpad/db";

import { env } from "../../config/env";
import { ApiError } from "../../lib/api-error";

const ACTIVE_DEPLOYMENT_STATUSES = ["QUEUED", "CLONING", "DETECTING", "BUILDING", "STARTING", "READY"] as const;

function isPortAvailable(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();

    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, "0.0.0.0", () => {
      server.close(() => resolve(true));
    });
  });
}

export async function allocatePreviewPort() {
  if (env.PREVIEW_PORT_RANGE_START > env.PREVIEW_PORT_RANGE_END) {
    throw new ApiError(
      500,
      "INVALID_PREVIEW_PORT_RANGE",
      "Preview port range configuration is invalid."
    );
  }

  for (let port = env.PREVIEW_PORT_RANGE_START; port <= env.PREVIEW_PORT_RANGE_END; port += 1) {
    const existing = await prisma.deployment.findFirst({
      where: {
        previewPort: port,
        status: {
          in: [...ACTIVE_DEPLOYMENT_STATUSES]
        }
      }
    });

    if (existing) {
      continue;
    }

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new ApiError(
    503,
    "NO_PREVIEW_PORTS_AVAILABLE",
    "No preview ports are currently available for new deployments."
  );
}

export function createPreviewUrl(port: number) {
  return `${env.PREVIEW_PROTOCOL}://${env.PREVIEW_HOST}:${port}`;
}
