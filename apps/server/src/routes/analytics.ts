import type { DeploymentStatus } from "@launchpad/types";
import type { Router } from "express";
import { Router as createRouter } from "express";

import { prisma } from "@launchpad/db";

import { asyncHandler } from "../lib/async-handler";
import { authenticateRequest } from "../middleware/auth";
import { toDeploymentDto } from "../services/projects";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function getDurationMs({
  startedAt,
  completedAt
}: {
  startedAt: Date | null;
  completedAt: Date | null;
}) {
  if (!startedAt || !completedAt) {
    return null;
  }

  return completedAt.getTime() - startedAt.getTime();
}

export const analyticsRouter: Router = createRouter();

analyticsRouter.use(authenticateRequest);

analyticsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsedDays = Number(req.query.days ?? 30);
    const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 365) : 30;
    const since = startOfDay(new Date(Date.now() - (days - 1) * DAY_IN_MS));

    const [activeProjects, deployments] = await Promise.all([
      prisma.project.count({
        where: {
          userId: req.user.id
        }
      }),
      prisma.deployment.findMany({
        where: {
          project: {
            userId: req.user.id
          },
          createdAt: {
            gte: since
          }
        },
        include: {
          project: true
        },
        orderBy: {
          createdAt: "asc"
        }
      })
    ]);

    const completedDeployments = deployments.filter(
      (deployment) => deployment.startedAt && deployment.completedAt
    );
    const totalDeployments = deployments.length;
    const successCount = deployments.filter((deployment) => deployment.status === "READY").length;
    const avgBuildDuration = completedDeployments.length
      ? Math.round(
          completedDeployments.reduce((total, deployment) => {
            return total + (getDurationMs(deployment) ?? 0);
          }, 0) / completedDeployments.length
        )
      : 0;

    const perDayMap = new Map<string, { total: number; success: number }>();

    for (let index = 0; index < days; index += 1) {
      const date = startOfDay(new Date(since.getTime() + index * DAY_IN_MS))
        .toISOString()
        .slice(0, 10);

      perDayMap.set(date, {
        total: 0,
        success: 0
      });
    }

    for (const deployment of deployments) {
      const dateKey = startOfDay(deployment.createdAt).toISOString().slice(0, 10);
      const bucket = perDayMap.get(dateKey);

      if (!bucket) {
        continue;
      }

      bucket.total += 1;

      if (deployment.status === "READY") {
        bucket.success += 1;
      }
    }

    const durationPerProjectMap = new Map<
      string,
      {
        totalDuration: number;
        count: number;
        latestCreatedAt: Date;
      }
    >();

    for (const deployment of completedDeployments) {
      const duration = getDurationMs(deployment);

      if (duration === null) {
        continue;
      }

      const existing = durationPerProjectMap.get(deployment.project.name);

      if (existing) {
        existing.totalDuration += duration;
        existing.count += 1;
        existing.latestCreatedAt =
          existing.latestCreatedAt > deployment.createdAt ? existing.latestCreatedAt : deployment.createdAt;
        continue;
      }

      durationPerProjectMap.set(deployment.project.name, {
        totalDuration: duration,
        count: 1,
        latestCreatedAt: deployment.createdAt
      });
    }

    const statusCounts = deployments.reduce<Record<string, number>>((accumulator, deployment) => {
      accumulator[deployment.status] = (accumulator[deployment.status] ?? 0) + 1;
      return accumulator;
    }, {});

    const recentDeployments = deployments
      .slice()
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 10)
      .map((deployment) => ({
        ...toDeploymentDto(deployment),
        projectName: deployment.project.name,
        branch: deployment.sourceBranch ?? deployment.project.branch,
        duration: getDurationMs(deployment)
      }));

    return res.json({
      data: {
        totalDeployments,
        successRate: totalDeployments ? Number(((successCount / totalDeployments) * 100).toFixed(1)) : 0,
        avgBuildDuration,
        activeProjects,
        deploymentsPerDay: Array.from(perDayMap.entries()).map(([date, values]) => ({
          date,
          total: values.total,
          success: values.success
        })),
        durationPerProject: Array.from(durationPerProjectMap.entries())
          .sort((left, right) => right[1].latestCreatedAt.getTime() - left[1].latestCreatedAt.getTime())
          .slice(0, 10)
          .map(([project, values]) => ({
            project,
            avgDuration: Math.round(values.totalDuration / values.count)
          })),
        statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({
          status: status as DeploymentStatus,
          count
        })),
        recentDeployments
      }
    });
  })
);
