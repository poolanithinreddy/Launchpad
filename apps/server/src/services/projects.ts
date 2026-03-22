import { prisma } from "@launchpad/db";

import { ApiError } from "../lib/api-error";

export function toEnvVarDto(envVar: {
  id: string;
  key: string;
  value: string;
  projectId: string;
}) {
  return {
    id: envVar.id,
    key: envVar.key,
    value: envVar.value,
    projectId: envVar.projectId
  };
}

export function toDeploymentDto(deployment: {
  id: string;
  status:
    | "QUEUED"
    | "CLONING"
    | "DETECTING"
    | "BUILDING"
    | "STARTING"
    | "READY"
    | "FAILED"
    | "STOPPED";
  previewUrl: string | null;
  previewPort: number | null;
  framework: string;
  sourceBranch: string | null;
  sourceCommitSha: string | null;
  commitMessage: string | null;
  errorMessage: string | null;
  aiAnalysis: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  projectId: string;
}) {
  return {
    id: deployment.id,
    status: deployment.status,
    previewUrl: deployment.previewUrl,
    previewPort: deployment.previewPort,
    framework: deployment.framework,
    sourceBranch: deployment.sourceBranch,
    sourceCommitSha: deployment.sourceCommitSha,
    commitMessage: deployment.commitMessage,
    errorMessage: deployment.errorMessage,
    aiAnalysis: deployment.aiAnalysis,
    createdAt: deployment.createdAt.toISOString(),
    updatedAt: deployment.updatedAt.toISOString(),
    startedAt: deployment.startedAt?.toISOString() ?? null,
    completedAt: deployment.completedAt?.toISOString() ?? null,
    projectId: deployment.projectId
  };
}

export function toProjectDto(
  project: {
    id: string;
    name: string;
    repoUrl: string;
    repoName: string;
    branch: string;
    framework: string;
    rootDir: string;
    liveUrl: string | null;
    webhookSecret: string;
    createdAt: Date;
    userId: string;
    envVars?: Array<{
      id: string;
      key: string;
      value: string;
      projectId: string;
    }>;
    deployments?: Array<{
      id: string;
      status:
        | "QUEUED"
        | "CLONING"
        | "DETECTING"
        | "BUILDING"
        | "STARTING"
        | "READY"
        | "FAILED"
        | "STOPPED";
      previewUrl: string | null;
      previewPort: number | null;
      framework: string;
      sourceBranch: string | null;
      sourceCommitSha: string | null;
      commitMessage: string | null;
      errorMessage: string | null;
      aiAnalysis: string | null;
      createdAt: Date;
      updatedAt: Date;
      startedAt: Date | null;
      completedAt: Date | null;
      projectId: string;
    }>;
    _count?: {
      envVars: number;
      deployments: number;
    };
  }
) {
  return {
    id: project.id,
    name: project.name,
    repoUrl: project.repoUrl,
    repoName: project.repoName,
    branch: project.branch,
    framework: project.framework,
    rootDir: project.rootDir,
    liveUrl: project.liveUrl,
    webhookSecret: project.webhookSecret,
    createdAt: project.createdAt.toISOString(),
    userId: project.userId,
    envVars: project.envVars?.map(toEnvVarDto),
    envVarCount: project._count?.envVars,
    latestDeployment: project.deployments?.[0] ? toDeploymentDto(project.deployments[0]) : null,
    deploymentCount: project._count?.deployments
  };
}

export async function findOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId
    }
  });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  return project;
}

export async function findOwnedProjectWithDeploymentAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId
    },
    include: {
      envVars: true,
      user: true
    }
  });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  return project;
}

export async function findOwnedDeployment(deploymentId: string, userId: string) {
  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      project: {
        userId
      }
    }
  });

  if (!deployment) {
    throw new ApiError(404, "DEPLOYMENT_NOT_FOUND", "Deployment not found.");
  }

  return deployment;
}
