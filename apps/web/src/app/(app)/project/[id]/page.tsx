"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeploymentDto } from "@launchpad/types";
import { ExternalLink, RefreshCcw, Settings } from "lucide-react";
import { toast } from "sonner";

import { AIAnalysisCard } from "@/components/project/AIAnalysisCard";
import { LogPanel } from "@/components/project/LogPanel";
import { DeploymentStatusBadge } from "@/components/deployment-status-badge";
import { EmptyState } from "@/components/empty-state";
import { DeploymentRowSkeleton, LogPanelSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { createDeployment, getDeployment, getProject, getProjectDeployments } from "@/lib/api";
import {
  formatDuration,
  formatFrameworkLabel,
  formatRelativeTime,
  frameworkBadgeClassName,
  getDeploymentDuration,
  isActiveDeploymentStatus
} from "@/lib/format";
import { cn } from "@/lib/utils";

type ProjectDetailPageProps = {
  params: {
    id: string;
  };
};

function DeploymentHistoryRow({
  deployment,
  branch,
  selected,
  onSelect
}: {
  deployment: DeploymentDto;
  branch: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const durationMs = useElapsedTime({
    startedAt: deployment.startedAt,
    completedAt: deployment.completedAt,
    live: isActiveDeploymentStatus(deployment.status)
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50",
        selected && "border-blue-200 bg-blue-50 shadow-[inset_3px_0_0_0_rgb(var(--info))]"
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[auto,1fr,auto] lg:items-center">
        <div>
          <DeploymentStatusBadge status={deployment.status} />
        </div>
        <div className="space-y-1">
          <p className="truncate font-semibold text-slate-950">
            {deployment.commitMessage ?? "Manual deployment"}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{deployment.sourceBranch ?? branch}</span>
            <span className="font-mono">{deployment.sourceCommitSha?.slice(0, 7) ?? "—"}</span>
          </div>
        </div>
        <div className="text-sm text-slate-500 lg:text-right">
          <p>{formatDuration(durationMs)}</p>
          <p className="mt-1 text-xs">{formatRelativeTime(deployment.createdAt)}</p>
        </div>
      </div>
    </button>
  );
}

function DeploymentSummary({ deployment }: { deployment: DeploymentDto }) {
  const duration = useElapsedTime({
    startedAt: deployment.startedAt,
    completedAt: deployment.completedAt,
    live: isActiveDeploymentStatus(deployment.status)
  });

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-sm text-slate-500">
              {deployment.sourceCommitSha?.slice(0, 7) ?? "manual"}
            </p>
            <DeploymentStatusBadge status={deployment.status} />
          </div>
          <h3 className="text-xl font-semibold text-slate-950">
            {deployment.commitMessage ?? "Manual deployment"}
          </h3>
        </div>
        <div className="space-y-1 text-sm text-slate-500 md:text-right">
          <p>Started {deployment.startedAt ? formatRelativeTime(deployment.startedAt) : "just now"}</p>
          <p>{formatDuration(duration)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(
    searchParams.get("deployment")
  );

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => getProject(params.id)
  });
  const { data: deployments, isLoading: areDeploymentsLoading } = useQuery({
    queryKey: ["project-deployments", params.id],
    queryFn: () => getProjectDeployments(params.id),
    refetchInterval: (query) =>
      query.state.data?.some((deployment) => isActiveDeploymentStatus(deployment.status)) ? 3_000 : false
  });
  const { data: selectedDeployment, isLoading: isSelectedDeploymentLoading } = useQuery({
    queryKey: ["deployment", selectedDeploymentId],
    queryFn: () => getDeployment(selectedDeploymentId as string),
    enabled: Boolean(selectedDeploymentId),
    refetchInterval: (query) => {
      const deployment = query.state.data;

      if (!deployment) {
        return false;
      }

      return isActiveDeploymentStatus(deployment.status) || (deployment.status === "FAILED" && !deployment.aiAnalysis)
        ? 3_000
        : false;
    }
  });

  const createDeploymentMutation = useMutation({
    mutationFn: () => createDeployment(params.id),
    onSuccess: async (deployment) => {
      toast.message("Build started");
      setSelectedDeploymentId(deployment.id);
      router.replace(`/project/${params.id}?deployment=${deployment.id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["project-deployments", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["deployments"] })
      ]);
    }
  });

  useEffect(() => {
    if (!deployments?.length) {
      setSelectedDeploymentId(null);
      return;
    }

    const requestedDeploymentId = searchParams.get("deployment");
    const hasRequestedDeployment = requestedDeploymentId
      ? deployments.some((deployment) => deployment.id === requestedDeploymentId)
      : false;

    setSelectedDeploymentId((current) => {
      if (hasRequestedDeployment) {
        return requestedDeploymentId;
      }

      return current && deployments.some((deployment) => deployment.id === current)
        ? current
        : deployments[0]?.id ?? null;
    });
  }, [deployments, searchParams]);

  const latestDeployment = deployments?.[0] ?? project?.latestDeployment ?? null;
  const deploymentSummary = useMemo(() => {
    if (!selectedDeployment) {
      return null;
    }

    return getDeploymentDuration({
      startedAt: selectedDeployment.startedAt,
      completedAt: selectedDeployment.completedAt
    });
  }, [selectedDeployment]);

  if (isProjectLoading || !project) {
    return <div className="h-80 animate-pulse rounded-[24px] border border-slate-200 bg-white" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{project.name}</h2>
            <Badge variant="outline" className={frameworkBadgeClassName(project.framework)}>
              {formatFrameworkLabel(project.framework)}
            </Badge>
            {latestDeployment ? <DeploymentStatusBadge status={latestDeployment.status} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>{project.repoName}</span>
            <span>{project.branch}</span>
            <span>{project.rootDir}</span>
            {project.liveUrl ? (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-medium text-blue-600"
              >
                {project.liveUrl}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => createDeploymentMutation.mutate()} disabled={createDeploymentMutation.isPending}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {createDeploymentMutation.isPending ? "Queueing..." : "Deploy now"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/project/${project.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[45%,55%]">
        <div className="space-y-4">
          <Card className="rounded-[24px]">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Deployment history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {areDeploymentsLoading ? (
                <DeploymentRowSkeleton />
              ) : deployments?.length ? (
                deployments.map((deployment) => (
                  <DeploymentHistoryRow
                    key={deployment.id}
                    deployment={deployment}
                    branch={project.branch}
                    selected={deployment.id === selectedDeploymentId}
                    onSelect={() => {
                      setSelectedDeploymentId(deployment.id);
                      router.replace(`/project/${params.id}?deployment=${deployment.id}`);
                    }}
                  />
                ))
              ) : (
                <EmptyState
                  icon="clock"
                  title="No deployments yet"
                  description="No deployments yet. Click 'Deploy now' to trigger your first build."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedDeployment ? (
            <>
              <DeploymentSummary deployment={selectedDeployment} />
              <LogPanel
                deploymentId={selectedDeployment.id}
                initialStatus={selectedDeployment.status}
                previewUrl={selectedDeployment.previewUrl}
                onStatusChange={async (status) => {
                  if (status === "READY" || status === "FAILED" || status === "STOPPED") {
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["project", params.id] }),
                      queryClient.invalidateQueries({ queryKey: ["project-deployments", params.id] }),
                      queryClient.invalidateQueries({ queryKey: ["deployment", selectedDeployment.id] }),
                      queryClient.invalidateQueries({ queryKey: ["projects"] }),
                      queryClient.invalidateQueries({ queryKey: ["analytics"] }),
                      queryClient.invalidateQueries({ queryKey: ["deployments"] })
                    ]);
                  }
                }}
              />
              <AIAnalysisCard deployment={selectedDeployment} />
            </>
          ) : isSelectedDeploymentLoading ? (
            <LogPanelSkeleton />
          ) : (
            <EmptyState
              icon="terminal"
              title="Waiting for a deployment"
              description="Select a deployment on the left to inspect build logs and status updates."
            />
          )}
        </div>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader>
          <CardTitle className="text-xl text-slate-950">Project metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Repository</p>
            <p className="mt-2 font-semibold text-slate-950">{project.repoName}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Branch</p>
            <p className="mt-2 font-semibold text-slate-950">{project.branch}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Framework</p>
            <p className="mt-2 font-semibold text-slate-950">{formatFrameworkLabel(project.framework)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Env vars</p>
            <p className="mt-2 font-semibold text-slate-950">{project.envVarCount ?? 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
