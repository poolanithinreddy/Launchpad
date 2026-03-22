import { randomBytes } from "crypto";

import { prisma } from "@launchpad/db";
import type { Request, Router } from "express";
import { Router as createRouter } from "express";

import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/api-error";
import { createEnvVarSchema, createProjectSchema, updateProjectSchema } from "../lib/validators";
import { authenticateRequest } from "../middleware/auth";
import { cleanupDeploymentArtifacts } from "../services/deployments/runtime";
import { findOwnedProject, toEnvVarDto, toProjectDto } from "../services/projects";

export const projectsRouter: Router = createRouter();

projectsRouter.use(authenticateRequest);

function getRequestBaseUrl(req: Request) {
  const protocol = req.get("x-forwarded-proto") ?? req.protocol;
  const host = req.get("x-forwarded-host") ?? req.get("host");

  if (!host) {
    throw new ApiError(500, "INVALID_REQUEST_HOST", "Request host is unavailable.");
  }

  return `${protocol}://${host}`;
}

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const projects = await prisma.project.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        deployments: {
          take: 1,
          orderBy: {
            createdAt: "desc"
          }
        },
        _count: {
          select: {
            envVars: true,
            deployments: true
          }
        }
      }
    });

    return res.json({
      data: projects.map(toProjectDto)
    });
  })
);

projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    const envKeys = new Set<string>();

    for (const envVar of input.envVars) {
      if (envKeys.has(envVar.key)) {
        throw new ApiError(
          400,
          "DUPLICATE_ENV_KEY",
          `Environment variable key "${envVar.key}" is duplicated.`
        );
      }

      envKeys.add(envVar.key);
    }

    const project = await prisma.project.create({
      data: {
        name: input.name,
        repoUrl: input.repoUrl,
        repoName: input.repoName,
        branch: input.branch,
        framework: input.framework,
        rootDir: input.rootDir,
        userId: req.user.id,
        envVars: input.envVars.length
          ? {
              create: input.envVars.map((envVar) => ({
                key: envVar.key,
                value: envVar.value
              }))
            }
          : undefined
      },
      include: {
        envVars: true,
        deployments: {
          take: 1,
          orderBy: {
            createdAt: "desc"
          }
        },
        _count: {
          select: {
            envVars: true,
            deployments: true
          }
        }
      }
    });

    return res.status(201).json({
      data: toProjectDto(project)
    });
  })
);

projectsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.user.id
      },
      include: {
        envVars: true,
        deployments: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        _count: {
          select: {
            envVars: true,
            deployments: true
          }
        }
      }
    });

    if (!project) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }

    return res.json({
      data: toProjectDto(project)
    });
  })
);

projectsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    const input = updateProjectSchema.parse(req.body);
    await findOwnedProject(projectId, req.user.id);

    const project = await prisma.project.update({
      where: {
        id: projectId
      },
      data: input,
      include: {
        envVars: true,
        deployments: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        _count: {
          select: {
            envVars: true,
            deployments: true
          }
        }
      }
    });

    return res.json({
      data: toProjectDto(project)
    });
  })
);

projectsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    await findOwnedProject(projectId, req.user.id);

    const deployments = await prisma.deployment.findMany({
      where: {
        projectId
      }
    });

    for (const deployment of deployments) {
      try {
        await cleanupDeploymentArtifacts({
          deploymentId: deployment.id,
          containerId: deployment.containerId,
          imageTag: deployment.imageTag
        });
      } catch (error) {
        console.error(`Failed to clean deployment artifacts for project ${projectId}.`, error);
      }
    }

    await prisma.project.delete({
      where: {
        id: projectId
      }
    });

    return res.json({
      data: {
        success: true
      }
    });
  })
);

projectsRouter.get(
  "/:id/webhook-info",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    const project = await findOwnedProject(projectId, req.user.id);

    return res.json({
      data: {
        webhookUrl: `${getRequestBaseUrl(req)}/webhooks/github/${project.id}`,
        webhookSecret: project.webhookSecret,
        events: ["push"]
      }
    });
  })
);

projectsRouter.put(
  "/:id/webhook-secret",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    await findOwnedProject(projectId, req.user.id);

    const project = await prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        webhookSecret: randomBytes(24).toString("hex")
      }
    });

    return res.json({
      data: {
        webhookUrl: `${getRequestBaseUrl(req)}/webhooks/github/${project.id}`,
        webhookSecret: project.webhookSecret,
        events: ["push"]
      }
    });
  })
);

projectsRouter.get(
  "/:id/env",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    await findOwnedProject(projectId, req.user.id);

    const envVars = await prisma.envVar.findMany({
      where: {
        projectId
      },
      orderBy: {
        key: "asc"
      }
    });

    return res.json({
      data: envVars.map(toEnvVarDto)
    });
  })
);

projectsRouter.post(
  "/:id/env",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    const input = createEnvVarSchema.parse(req.body);
    await findOwnedProject(projectId, req.user.id);

    const existingEnvVar = await prisma.envVar.findFirst({
      where: {
        projectId,
        key: input.key
      }
    });

    if (existingEnvVar) {
      throw new ApiError(
        400,
        "ENV_VAR_EXISTS",
        `Environment variable key "${input.key}" already exists for this project.`
      );
    }

    const envVar = await prisma.envVar.create({
      data: {
        key: input.key,
        value: input.value,
        projectId
      }
    });

    return res.status(201).json({
      data: toEnvVarDto(envVar)
    });
  })
);

projectsRouter.delete(
  "/:id/env/:envId",
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    const envId = String(req.params.envId);
    await findOwnedProject(projectId, req.user.id);

    const envVar = await prisma.envVar.findFirst({
      where: {
        id: envId,
        projectId
      }
    });

    if (!envVar) {
      throw new ApiError(404, "ENV_VAR_NOT_FOUND", "Environment variable not found.");
    }

    await prisma.envVar.delete({
      where: {
        id: envVar.id
      }
    });

    return res.json({
      data: {
        success: true
      }
    });
  })
);
