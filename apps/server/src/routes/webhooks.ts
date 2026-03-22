import crypto, { timingSafeEqual } from "crypto";
import type { Router } from "express";
import { Router as createRouter } from "express";

import { prisma } from "@launchpad/db";

import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/api-error";
import { enqueueDeploymentJob } from "../queues/deployments";
import { createDeploymentRecord, updateDeploymentStatus } from "../services/deployments/records";

type GitHubPushPayload = {
  ref?: string;
  head_commit?: {
    id?: string;
    message?: string;
  };
};

export const webhooksRouter: Router = createRouter({
  mergeParams: true
});

webhooksRouter.post(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.projectId);
    const project = await prisma.project.findUnique({
      where: {
        id: projectId
      }
    });

    if (!project) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    const signature = req.headers["x-hub-signature-256"];

    if (typeof signature !== "string") {
      throw new ApiError(401, "INVALID_GITHUB_SIGNATURE", "GitHub signature is missing.");
    }

    const hmac = crypto.createHmac("sha256", project.webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    if (
      signature.length !== expectedSignature.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      throw new ApiError(401, "INVALID_GITHUB_SIGNATURE", "GitHub signature is invalid.");
    }

    if (req.headers["x-github-event"] !== "push") {
      return res.json({
        data: {
          received: true
        }
      });
    }

    let payload: GitHubPushPayload;

    try {
      payload = JSON.parse(rawBody.toString("utf8")) as GitHubPushPayload;
    } catch {
      throw new ApiError(400, "INVALID_WEBHOOK_PAYLOAD", "GitHub webhook payload is invalid.");
    }
    const branch = payload.ref?.replace("refs/heads/", "") ?? "";

    if (!branch || branch !== project.branch) {
      return res.json({
        data: {
          received: true
        }
      });
    }

    const deployment = await createDeploymentRecord({
      projectId: project.id,
      framework: project.framework,
      sourceBranch: branch,
      sourceCommitSha: payload.head_commit?.id ?? null,
      commitMessage: payload.head_commit?.message ?? null
    });

    try {
      await enqueueDeploymentJob({
        deploymentId: deployment.id
      });
    } catch {
      await updateDeploymentStatus(deployment.id, "FAILED", {
        errorMessage: "Launchpad could not enqueue this deployment. Check Redis and the worker process.",
        completedAt: new Date()
      });

      throw new ApiError(
        503,
        "DEPLOYMENT_QUEUE_UNAVAILABLE",
        "Launchpad could not enqueue this deployment. Check Redis and the worker process."
      );
    }

    return res.json({
      data: {
        received: true
      }
    });
  })
);
