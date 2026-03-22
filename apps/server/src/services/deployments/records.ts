import { prisma } from "@launchpad/db";
import type { DeploymentStatus } from "@launchpad/types";

import { publishDeploymentEvent } from "./events";

type DeploymentUpdateData = {
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  previewUrl?: string | null;
  previewPort?: number | null;
  imageTag?: string | null;
  containerId?: string | null;
  sourceCommitSha?: string | null;
  sourceBranch?: string | null;
  commitMessage?: string | null;
  aiAnalysis?: string | null;
  framework?: string;
};

export async function createDeploymentRecord({
  projectId,
  framework,
  sourceBranch,
  sourceCommitSha,
  commitMessage
}: {
  projectId: string;
  framework: string;
  sourceBranch?: string | null;
  sourceCommitSha?: string | null;
  commitMessage?: string | null;
}) {
  return prisma.deployment.create({
    data: {
      projectId,
      framework,
      sourceBranch: sourceBranch ?? null,
      sourceCommitSha: sourceCommitSha ?? null,
      commitMessage: commitMessage ?? null
    }
  });
}

export async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  data: DeploymentUpdateData = {}
) {
  const deployment = await prisma.deployment.update({
    where: {
      id: deploymentId
    },
    data: {
      status,
      ...data
    }
  });

  await publishDeploymentEvent({
    type: "deployment-status",
    deploymentId,
    status
  });

  return deployment;
}
