"use client";

import Link from "next/link";
import { ExternalLink, RefreshCcw, Rocket, Settings } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeploymentDto } from "@launchpad/types";

import { DeploymentStatusBadge } from "@/components/deployment-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDeployment, getProject, getProjectDeployments } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";

type ProjectDetailPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const queryClient = useQueryClient();
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => getProject(params.id)
  });
  const { data: deployments, error: deploymentsError } = useQuery({
    queryKey: ["project-deployments", params.id],
    queryFn: () => getProjectDeployments(params.id),
    refetchInterval: (query) =>
      query.state.data?.some((deployment) =>
        ["QUEUED", "CLONING", "DETECTING", "BUILDING", "STARTING"].includes(deployment.status)
      )
        ? 5000
        : false
  });

  const createDeploymentMutation = useMutation({
    mutationFn: () => createDeployment(params.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["project-deployments", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] })
      ]);
    }
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />;
  }

  if (error || !project) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {getApiErrorMessage(error, "Project could not be loaded.")}
      </div>
    );
  }

  const latestDeployment = deployments?.[0] ?? project.latestDeployment ?? null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
            <Badge variant="secondary">{project.framework}</Badge>
          </div>
          <p className="text-sm text-slate-600">
            Connected to {project.repoName} on the {project.branch} branch.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={() => createDeploymentMutation.mutate()}
            disabled={createDeploymentMutation.isPending}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {createDeploymentMutation.isPending ? "Queueing deployment..." : "Deploy latest"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/project/${project.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Edit settings
            </Link>
          </Button>
        </div>
      </section>

      {createDeploymentMutation.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(
            createDeploymentMutation.error,
            "Deployment could not be queued."
          )}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-slate-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Repository</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-900">{project.repoName}</p>
                <p>Root directory: {project.rootDir}</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <a href={project.repoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View repo
                </a>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Branch</p>
                <p className="mt-2 text-base font-medium text-slate-900">{project.branch}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</p>
                <p className="mt-2 text-base font-medium text-slate-900">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live URL</p>
              {project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center text-base font-medium text-emerald-700 hover:text-emerald-600"
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  {project.liveUrl}
                </a>
              ) : (
                <p className="mt-2 text-base font-medium text-slate-900">Not deployed yet</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest deployment</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {latestDeployment ? (
                  <>
                    <DeploymentStatusBadge status={latestDeployment.status} />
                    <span className="text-sm text-slate-500">
                      {new Date(latestDeployment.createdAt).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No deployments yet.</p>
                )}
              </div>
              {latestDeployment?.errorMessage ? (
                <p className="mt-3 text-sm text-red-700">{latestDeployment.errorMessage}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Environment variables
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.envVars?.length ? (
                  project.envVars.map((envVar) => (
                    <Badge key={envVar.id} variant="outline">
                      {envVar.key}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No environment variables configured.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900">Deployment history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deploymentsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {getApiErrorMessage(deploymentsError, "Deployment history could not be loaded.")}
            </div>
          ) : null}

          {deployments?.length ? (
            deployments.map((deployment: DeploymentDto) => (
              <div
                key={deployment.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <DeploymentStatusBadge status={deployment.status} />
                    <p className="font-medium text-slate-900">
                      {deployment.framework} deployment
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Started {new Date(deployment.createdAt).toLocaleString()}
                  </p>
                  {deployment.sourceCommitSha ? (
                    <p className="font-mono text-xs text-slate-500">
                      Commit {deployment.sourceCommitSha.slice(0, 10)}
                    </p>
                  ) : null}
                  {deployment.errorMessage ? (
                    <p className="text-sm text-red-700">{deployment.errorMessage}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  {deployment.previewUrl && deployment.status === "READY" ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={deployment.previewUrl} target="_blank" rel="noreferrer">
                        <Rocket className="mr-2 h-4 w-4" />
                        Open preview
                      </a>
                    </Button>
                  ) : (
                    <p className="text-slate-500">
                      {deployment.previewUrl ?? "Preview URL will appear after startup."}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No deployments yet. Queue the first one to build a local preview.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
