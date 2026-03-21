import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { URL } from "url";

import { prisma } from "@launchpad/db";

import { ApiError } from "../../lib/api-error";
import { runCommand } from "../../lib/run-command";
import { detectBuildPlan, createDockerfile } from "./framework";
import { allocatePreviewPort, createPreviewUrl } from "./preview";

export type DeploymentJobData = {
  deploymentId: string;
};

type DeploymentStatus =
  | "QUEUED"
  | "CLONING"
  | "DETECTING"
  | "BUILDING"
  | "STARTING"
  | "READY"
  | "FAILED"
  | "STOPPED";

function getContainerName(deploymentId: string) {
  return `launchpad-deployment-${deploymentId.toLowerCase()}`;
}

function getImageTag(deploymentId: string) {
  return `launchpad-deployment:${deploymentId.toLowerCase()}`;
}

function createAuthenticatedRepoUrl(repoUrl: string, accessToken: string) {
  const parsedUrl = new URL(repoUrl);

  if (parsedUrl.hostname !== "github.com") {
    throw new ApiError(
      400,
      "UNSUPPORTED_REPOSITORY",
      "Launchpad Phase 2 supports GitHub repositories only."
    );
  }

  const repoPath = parsedUrl.pathname.replace(/^\//, "").replace(/\.git$/, "");
  return `https://x-access-token:${encodeURIComponent(accessToken)}@github.com/${repoPath}.git`;
}

function createPublicRepoCloneUrl(repoUrl: string) {
  const parsedUrl = new URL(repoUrl);
  const repoPath = parsedUrl.pathname.replace(/^\//, "").replace(/\.git$/, "");
  return `https://github.com/${repoPath}.git`;
}

function getDeploymentErrorMessage(error: unknown) {
  if (error instanceof AggregateError) {
    const message = error.errors
      .map((entry) => (entry instanceof Error ? entry.message : String(entry)))
      .filter(Boolean)
      .join("; ");

    return message || "Deployment failed.";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Deployment failed.";
}

async function cloneRepository({
  repoUrl,
  accessToken,
  branch,
  destination
}: {
  repoUrl: string;
  accessToken: string;
  branch: string;
  destination: string;
}) {
  const cloneArgs = ["clone", "--depth", "1", "--branch", branch];

  try {
    await runCommand("git", [...cloneArgs, createAuthenticatedRepoUrl(repoUrl, accessToken), destination]);
  } catch {
    await runCommand("git", [...cloneArgs, createPublicRepoCloneUrl(repoUrl), destination]);
  }
}

async function updateDeployment(
  deploymentId: string,
  status: DeploymentStatus,
  data: Record<string, unknown> = {}
) {
  await prisma.deployment.update({
    where: {
      id: deploymentId
    },
    data: {
      status,
      ...data
    }
  });
}

async function cleanupDockerArtifacts({
  containerName,
  imageTag
}: {
  containerName?: string | null;
  imageTag?: string | null;
}) {
  if (containerName) {
    await runCommand("docker", ["rm", "-f", containerName], {
      ignoreExitCode: true
    });
  }

  if (imageTag) {
    await runCommand("docker", ["image", "rm", "-f", imageTag], {
      ignoreExitCode: true
    });
  }
}

export async function cleanupDeploymentArtifacts({
  deploymentId,
  containerId,
  imageTag
}: {
  deploymentId: string;
  containerId?: string | null;
  imageTag?: string | null;
}) {
  await cleanupDockerArtifacts({
    containerName: containerId ?? getContainerName(deploymentId),
    imageTag
  });
}

async function deactivatePreviousDeployments(projectId: string, currentDeploymentId: string) {
  const activeDeployments = await prisma.deployment.findMany({
    where: {
      projectId,
      id: {
        not: currentDeploymentId
      },
      status: {
        in: ["READY", "STARTING"]
      }
    }
  });

  if (!activeDeployments.length) {
    return;
  }

  const now = new Date();

  for (const deployment of activeDeployments) {
    await cleanupDeploymentArtifacts({
      deploymentId: deployment.id,
      containerId: deployment.containerId,
      imageTag: deployment.imageTag
    });

    await prisma.deployment.update({
      where: {
        id: deployment.id
      },
      data: {
        status: "STOPPED",
        completedAt: deployment.completedAt ?? now
      }
    });
  }
}

export async function processDeploymentJob({ deploymentId }: DeploymentJobData) {
  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId
    },
    include: {
      project: {
        include: {
          envVars: true,
          user: true
        }
      }
    }
  });

  if (!deployment) {
    return;
  }

  const containerName = getContainerName(deployment.id);
  const imageTag = getImageTag(deployment.id);
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "launchpad-deployment-"));
  const repositoryDirectory = path.join(temporaryDirectory, "repo");

  try {
    await cleanupDockerArtifacts({
      containerName,
      imageTag
    });

    await updateDeployment(deployment.id, "CLONING", {
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      previewUrl: null,
      previewPort: null,
      imageTag,
      containerId: null
    });

    await cloneRepository({
      repoUrl: deployment.project.repoUrl,
      accessToken: deployment.project.user.accessToken,
      branch: deployment.project.branch,
      destination: repositoryDirectory
    });

    const revision = await runCommand("git", ["rev-parse", "HEAD"], {
      cwd: repositoryDirectory
    });

    await updateDeployment(deployment.id, "DETECTING", {
      sourceCommitSha: revision.stdout.trim()
    });

    const buildPlan = await detectBuildPlan({
      repositoryRoot: repositoryDirectory,
      rootDir: deployment.project.rootDir,
      configuredFramework: deployment.project.framework
    });

    await prisma.$transaction([
      prisma.deployment.update({
        where: {
          id: deployment.id
        },
        data: {
          framework: buildPlan.framework
        }
      }),
      prisma.project.update({
        where: {
          id: deployment.projectId
        },
        data: {
          framework: buildPlan.framework
        }
      })
    ]);

    const dockerfilePath = path.join(repositoryDirectory, ".launchpad.Dockerfile");
    await writeFile(dockerfilePath, createDockerfile(buildPlan), "utf8");

    await updateDeployment(deployment.id, "BUILDING");

    await runCommand("docker", [
      "build",
      "-f",
      dockerfilePath,
      "-t",
      imageTag,
      "--label",
      "launchpad.managed=true",
      "--label",
      `launchpad.projectId=${deployment.projectId}`,
      "--label",
      `launchpad.deploymentId=${deployment.id}`,
      repositoryDirectory
    ]);

    const previewPort = await allocatePreviewPort();
    const previewUrl = createPreviewUrl(previewPort);

    await updateDeployment(deployment.id, "STARTING", {
      previewPort,
      previewUrl
    });

    const dockerRunArgs = [
      "run",
      "-d",
      "--name",
      containerName,
      "--label",
      "launchpad.managed=true",
      "--label",
      `launchpad.projectId=${deployment.projectId}`,
      "--label",
      `launchpad.deploymentId=${deployment.id}`,
      "-p",
      `${previewPort}:3000`,
      "-e",
      "PORT=3000"
    ];

    for (const envVar of deployment.project.envVars) {
      dockerRunArgs.push("-e", `${envVar.key}=${envVar.value}`);
    }

    dockerRunArgs.push(imageTag);

    const container = await runCommand("docker", dockerRunArgs);
    const containerId = container.stdout.trim();

    await deactivatePreviousDeployments(deployment.projectId, deployment.id);

    await prisma.$transaction([
      prisma.deployment.update({
        where: {
          id: deployment.id
        },
        data: {
          status: "READY",
          containerId,
          completedAt: new Date()
        }
      }),
      prisma.project.update({
        where: {
          id: deployment.projectId
        },
        data: {
          liveUrl: previewUrl
        }
      })
    ]);
  } catch (error) {
    await cleanupDockerArtifacts({
      containerName,
      imageTag
    });

    await prisma.deployment.update({
      where: {
        id: deployment.id
      },
      data: {
        status: "FAILED",
        errorMessage: getDeploymentErrorMessage(error),
        completedAt: new Date(),
        previewUrl: null,
        previewPort: null,
        containerId: null
      }
    });
  } finally {
    await rm(temporaryDirectory, {
      recursive: true,
      force: true
    });
  }
}
