"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/empty-state";
import { useAppShellSearch } from "@/components/app-shell";
import { ProjectCard } from "@/components/project-card";
import { ProjectCardSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { getAnalytics, getProjects } from "@/lib/api";
import { formatDuration, isActiveDeploymentStatus } from "@/lib/format";

function MetricCard({
  label,
  value,
  trend,
  positive = true
}: {
  label: string;
  value: string;
  trend: string;
  positive?: boolean;
}) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            positive ? "text-emerald-600" : "text-red-500"
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {trend}
        </div>
      </div>
      <p className="mt-4 text-[32px] font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function ActiveBuildBanner({
  projectName,
  projectId,
  commitMessage,
  startedAt
}: {
  projectName: string;
  projectId: string;
  commitMessage: string | null;
  startedAt: string | null;
}) {
  const duration = useElapsedTime({
    startedAt,
    completedAt: null,
    live: true
  });

  return (
    <Link
      href={`/project/${projectId}`}
      className="flex flex-col gap-3 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <span className="font-medium">Building {projectName}...</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-amber-800/80">
        <span className="max-w-xs truncate">{commitMessage ?? "Preparing deployment"}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { query } = useAppShellSearch();
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects
  });
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["analytics", 30],
    queryFn: () => getAnalytics(30)
  });

  const filteredProjects =
    projects?.filter((project) => {
      const search = query.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return (
        project.name.toLowerCase().includes(search) ||
        project.repoName.toLowerCase().includes(search) ||
        project.branch.toLowerCase().includes(search)
      );
    }) ?? [];

  const activeBuildProject = projects?.find((project) =>
    project.latestDeployment ? isActiveDeploymentStatus(project.latestDeployment.status) : false
  );

  const recentHalf = analytics?.deploymentsPerDay.slice(-7) ?? [];
  const previousHalf = analytics?.deploymentsPerDay.slice(-14, -7) ?? [];
  const recentTotal = recentHalf.reduce((total, bucket) => total + bucket.total, 0);
  const previousTotal = previousHalf.reduce((total, bucket) => total + bucket.total, 0);
  const deploymentTrend = recentTotal >= previousTotal ? "vs last week" : "cooling off";

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            Build fast. Watch every deploy.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Launchpad keeps your GitHub projects, deployments, previews, and analytics in one place.
          </p>
        </div>
        <Button asChild>
          <Link href="/new-project">
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isAnalyticsLoading ? (
          Array.from({ length: 4 }).map((_, index) => <ProjectCardSkeleton key={index} />)
        ) : (
          <>
            <MetricCard
              label="Total Deployments"
              value={String(analytics?.totalDeployments ?? 0)}
              trend={deploymentTrend}
              positive={recentTotal >= previousTotal}
            />
            <MetricCard
              label="Avg Build Time"
              value={formatDuration(analytics?.avgBuildDuration ?? 0)}
              trend="recent average"
              positive={true}
            />
            <MetricCard
              label="Success Rate"
              value={`${analytics?.successRate ?? 0}%`}
              trend="ready builds"
              positive={(analytics?.successRate ?? 0) >= 70}
            />
            <MetricCard
              label="Active Projects"
              value={String(analytics?.activeProjects ?? 0)}
              trend="connected repos"
              positive={(analytics?.activeProjects ?? 0) > 0}
            />
          </>
        )}
      </section>

      {activeBuildProject?.latestDeployment ? (
        <ActiveBuildBanner
          projectName={activeBuildProject.name}
          projectId={activeBuildProject.id}
          commitMessage={activeBuildProject.latestDeployment.commitMessage}
          startedAt={activeBuildProject.latestDeployment.startedAt}
        />
      ) : null}

      {isProjectsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredProjects.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="rocket"
          title="No projects yet"
          description="Import your first GitHub repo to get started."
          action={
            <Button asChild>
              <Link href="/new-project">New project</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
