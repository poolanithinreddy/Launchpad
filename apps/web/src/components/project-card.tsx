import Link from "next/link";
import type { DeploymentStatus, ProjectDto } from "@launchpad/types";

import { Badge } from "@/components/ui/badge";
import { formatFrameworkLabel, formatRelativeTime, frameworkBadgeClassName, statusDotClassName } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusDot({ status }: { status: DeploymentStatus | null }) {
  if (!status) {
    return <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />;
  }

  const isAnimated = status === "READY" || status === "BUILDING" || status === "QUEUED";

  return (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      {isAnimated ? (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60",
            status === "READY" ? "animate-ping bg-emerald-400/50" : "animate-pulse bg-amber-400/40"
          )}
        />
      ) : null}
      <span className={cn("relative h-2.5 w-2.5 rounded-full", statusDotClassName(status))} />
    </span>
  );
}

export function ProjectCard({ project }: { project: ProjectDto }) {
  const latestDeployment = project.latestDeployment;

  return (
    <Link
      href={`/project/${project.id}`}
      className="group flex h-full flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-5 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="truncate text-lg font-semibold text-slate-950">{project.name}</h3>
              <Badge variant="outline" className={frameworkBadgeClassName(project.framework)}>
                {formatFrameworkLabel(project.framework)}
              </Badge>
            </div>
            <p className="mt-2 truncate text-sm text-slate-500">{project.repoName}</p>
          </div>

          <StatusDot status={latestDeployment?.status ?? null} />
        </div>

        <div className="space-y-3 text-sm text-slate-500">
          {project.liveUrl ? (
            <span className="block truncate font-medium text-blue-600">{project.liveUrl}</span>
          ) : (
            <span className="block truncate">Preview URL will appear after the first successful deploy.</span>
          )}
          <div className="flex items-center justify-between">
            <span>Branch {project.branch}</span>
            <span>{project.envVarCount ?? 0} env vars</span>
          </div>
          <p className="text-xs text-slate-400">
            {latestDeployment
              ? `Deployed ${formatRelativeTime(latestDeployment.createdAt)}`
              : "No deployments yet"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end text-sm font-medium text-slate-950">
        View project <span className="ml-1 transition group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}
