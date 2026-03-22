import { prisma } from "@launchpad/db";
import type { Router } from "express";
import { Router as createRouter } from "express";

import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/api-error";
import { authenticateRequest } from "../middleware/auth";
import { enqueueDeploymentJob } from "../queues/deployments";
import { createDeploymentRecord, updateDeploymentStatus } from "../services/deployments/records";
import { getDeploymentLogs } from "../services/deployments/logs";
import {
  findOwnedDeployment,
  findOwnedProjectWithDeploymentAccess,
  toDeploymentDto
} from "../services/projects";

export const projectDeploymentsRouter: Router = createRouter({
  mergeParams: true
});

projectDeploymentsRouter.use(authenticateRequest);

projectDeploymentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    await findOwnedProjectWithDeploymentAccess(projectId, req.user.id);

    const deployments = await prisma.deployment.findMany({
      where: {
        projectId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json({
      data: deployments.map(toDeploymentDto)
    });
  })
);

projectDeploymentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    const project = await findOwnedProjectWithDeploymentAccess(projectId, req.user.id);

    const deployment = await createDeploymentRecord({
      projectId: project.id,
      framework: project.framework,
      sourceBranch: project.branch
    });

    try {
      await enqueueDeploymentJob({
        deploymentId: deployment.id
      });
    } catch (error) {
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

    return res.status(202).json({
      data: toDeploymentDto(deployment)
    });
  })
);

export const deploymentsRouter: Router = createRouter();

deploymentsRouter.use(authenticateRequest);

deploymentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const deployments = await prisma.deployment.findMany({
      where: {
        project: {
          userId: req.user.id
        }
      },
      include: {
        project: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return res.json({
      data: deployments.map((deployment) => ({
        ...toDeploymentDto(deployment),
        projectName: deployment.project.name,
        branch: deployment.sourceBranch ?? deployment.project.branch,
        duration:
          deployment.startedAt && deployment.completedAt
            ? deployment.completedAt.getTime() - deployment.startedAt.getTime()
            : null
      }))
    });
  })
);

deploymentsRouter.get(
  "/:deploymentId/logs",
  asyncHandler(async (req, res) => {
    const deploymentId = String(req.params.deploymentId);
    await findOwnedDeployment(deploymentId, req.user.id);

    return res.json({
      data: await getDeploymentLogs(deploymentId)
    });
  })
);

deploymentsRouter.get(
  "/:deploymentId",
  asyncHandler(async (req, res) => {
    const deploymentId = String(req.params.deploymentId);
    await findOwnedDeployment(deploymentId, req.user.id);

    const deployment = await prisma.deployment.findUnique({
      where: {
        id: deploymentId
      }
    });

    if (!deployment) {
      throw new ApiError(404, "DEPLOYMENT_NOT_FOUND", "Deployment not found.");
    }

    return res.json({
      data: toDeploymentDto(deployment)
    });
  })
);
