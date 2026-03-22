import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { URL } from "url";

import { prisma } from "@launchpad/db";

import { ApiError } from "../../lib/api-error";
import { runCommand } from "../../lib/run-command";
import { analyzeFailure } from "../ai.service";
import { appendDeploymentLogLine } from "./logs";
import { updateDeploymentStatus } from "./records";
import { detectBuildPlan, createDockerfile } from "./framework";
import { allocatePreviewPort, createPreviewUrl } from "./preview";

export type DeploymentJobData = {
  deploymentId: string;
};

function getContainerName(deploymentId: string) {
  return `launchpad-deployment-${deploymentId.toLowerCase()}`;
}

function getImageTag(deploymentId: string) {
  return `launchpad-deployment:${deploymentId.toLowerCase()}`;
}

function createAuthenticatedRepoUrl(repoUrl: string, accessToken: string) {
  const parsedUrl = new URL(repoUrl);

  if (parsedUrl.hostname !== "github.com") {
    throw new ApiError(400, "UNSUPPORTED_REPOSITORY", "Launchpad supports GitHub repositories only.");
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

async function streamCommandOutput(deploymentId: string, text: string) {
  await appendDeploymentLogLine({
    deploymentId,
    text
  });
}

async function runDeploymentCommand({
  deploymentId,
  command,
  args,
  cwd,
  ignoreExitCode
}: {
  deploymentId: string;
  command: string;
  args: string[];
  cwd?: string;
  ignoreExitCode?: boolean;
}) {
  return runCommand(command, args, {
    cwd,
    ignoreExitCode,
    onStdoutLine: async (line) => {
      await streamCommandOutput(deploymentId, line);
    },
    onStderrLine: async (line) => {
      await streamCommandOutput(deploymentId, line);
    }
  });
}

async function cloneRepository({
  deploymentId,
  repoUrl,
  accessToken,
  branch,
  destination
}: {
  deploymentId: string;
  repoUrl: string;
  accessToken: string;
  branch: string;
  destination: string;
}) {
  const cloneArgs = ["clone", "--depth", "1", "--branch", branch];

  try {
    await runDeploymentCommand({
      deploymentId,
      command: "git",
      args: [...cloneArgs, createAuthenticatedRepoUrl(repoUrl, accessToken), destination]
    });
  } catch (error) {
    await appendDeploymentLogLine({
      deploymentId,
      text: "Falling back to public GitHub clone URL.",
      level: "warn"
    });

    await runDeploymentCommand({
      deploymentId,
      command: "git",
      args: [...cloneArgs, createPublicRepoCloneUrl(repoUrl), destination]
    });

    if (error instanceof Error) {
      console.warn("Authenticated clone failed; public clone fallback succeeded.", error);
    }
  }
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

    await updateDeploymentStatus(deployment.id, "STOPPED", {
      completedAt: deployment.completedAt ?? now
    });
  }
}

async function getLatestCommitMessage(repositoryDirectory: string) {
  const result = await runCommand("git", ["log", "-1", "--pretty=%s"], {
    cwd: repositoryDirectory
  });

  return result.stdout.trim() || null;
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

    await appendDeploymentLogLine({
      deploymentId: deployment.id,
      text: `Preparing deployment for ${deployment.project.name}.`
    });

    await updateDeploymentStatus(deployment.id, "CLONING", {
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      aiAnalysis: null,
      previewUrl: null,
      previewPort: null,
      imageTag,
      containerId: null,
      sourceBranch: deployment.sourceBranch ?? deployment.project.branch
    });

    await appendDeploymentLogLine({
      deploymentId: deployment.id,
      text: `Cloning ${deployment.project.repoName} from branch ${deployment.project.branch}.`
    });

    await cloneRepository({
      deploymentId: deployment.id,
      repoUrl: deployment.project.repoUrl,
      accessToken: deployment.project.user.accessToken,
      branch: deployment.project.branch,
      destination: repositoryDirectory
    });

    const revision = await runCommand("git", ["rev-parse", "HEAD"], {
      cwd: repositoryDirectory
    });
    const sourceCommitSha = revision.stdout.trim() || null;
    const commitMessage = await getLatestCommitMessage(repositoryDirectory);

    await updateDeploymentStatus(deployment.id, "DETECTING", {
      sourceCommitSha,
      sourceBranch: deployment.project.branch,
      commitMessage
    });

    if (sourceCommitSha) {
      await appendDeploymentLogLine({
        deploymentId: deployment.id,
        text: `Resolved commit ${sourceCommitSha.slice(0, 7)}${commitMessage ? ` - ${commitMessage}` : ""}.`,
        level: "success"
      });
    }

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

    await appendDeploymentLogLine({
      deploymentId: deployment.id,
      text: `Detected ${buildPlan.framework} build plan in ${buildPlan.workingDirectory}.`,
      level: "success"
    });

    const dockerfilePath = path.join(repositoryDirectory, ".launchpad.Dockerfile");
    await writeFile(dockerfilePath, createDockerfile(buildPlan), "utf8");

    await updateDeploymentStatus(deployment.id, "BUILDING", {
      framework: buildPlan.framework
    });

    await appendDeploymentLogLine({
      deploymentId: deployment.id,
      text: "Starting Docker build."
    });

    await runDeploymentCommand({
      deploymentId: deployment.id,
      command: "docker",
      args: [
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
      ]
    });

    const previewPort = await allocatePreviewPort();
    const previewUrl = createPreviewUrl(previewPort);

    await updateDeploymentStatus(deployment.id, "STARTING", {
      previewPort,
      previewUrl
    });

    await appendDeploymentLogLine({
      deploymentId: deployment.id,
      text: `Starting preview container on ${previewUrl}.`
    });

    const dockerRunArgs = [
      "run",
      "-d",
      "--rm",
      "--name",
      containerName,
      "--label",
      "launchpad.managed=true",
      "--label",
      `launchpad.projectId=${deployment.projectId}`,
      "--label",
      `launchpad.deploymentId=${deployment.id}`,
      "-p",
      `${previewPort}:${buildPlan.containerPort}`,
      "-e",
      `PORT=${buildPlan.containerPort}`
    ];

    for (const envVar of deployment.project.envVars) {
      dockerRunArgs.push("-e", `${envVar.key}=${envVar.value}`);
    }

    dockerRunArgs.push(imageTag);

    const container = await runDeploymentCommand({
      deploymentId: deployment.id,
      command: "docker",
      args: dockerRunArgs
    });
    const containerId = container.stdout.trim();

    await deactivatePreviousDeployments(deployment.projectId, deployment.id);

    await updateDeploymentStatus(deployment.id, "READY", {
      containerId,
      completedAt: new Date()
    });

    await prisma.project.update({
      where: {
        id: deployment.projectId
      },
      data: {
        liveUrl: previewUrl
      }
    });

    await appendDeploymentLogLine({
      deploymentId: deployment.id,
      text: `Deployment ready at ${previewUrl}.`,
      level: "success"
    });
  } catch (error) {
    const errorMessage = getDeploymentErrorMessage(error);

    await cleanupDockerArtifacts({
      containerName,
      imageTag
    });

    await appendDeploymentLogLine({
      deploymentId: deployment.id,
      text: errorMessage,
      level: "error"
    });

    await updateDeploymentStatus(deployment.id, "FAILED", {
      errorMessage,
      completedAt: new Date(),
      previewUrl: null,
      previewPort: null,
      containerId: null
    });

    const analysis = await analyzeFailure(deployment.id, deployment.project.name);

    if (analysis) {
      await prisma.deployment.update({
        where: {
          id: deployment.id
        },
        data: {
          aiAnalysis: analysis
        }
      });
    }
  } finally {
    await rm(temporaryDirectory, {
      recursive: true,
      force: true
    });
  }
}
