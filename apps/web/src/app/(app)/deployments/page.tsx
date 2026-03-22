"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useAppShellSearch } from "@/components/app-shell";
import { DeploymentStatusBadge } from "@/components/deployment-status-badge";
import { EmptyState } from "@/components/empty-state";
import { DeploymentRowSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDeployments } from "@/lib/api";
import { formatDuration, formatRelativeTime } from "@/lib/format";

export default function DeploymentsPage() {
  const { query } = useAppShellSearch();
  const { data: deployments, isLoading } = useQuery({
    queryKey: ["deployments"],
    queryFn: getDeployments
  });

  const filteredDeployments =
    deployments?.filter((deployment) => {
      const search = query.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return (
        deployment.projectName.toLowerCase().includes(search) ||
        deployment.branch.toLowerCase().includes(search) ||
        (deployment.commitMessage ?? "").toLowerCase().includes(search) ||
        deployment.id.toLowerCase().includes(search)
      );
    }) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Deployments</h2>
        <p className="mt-2 text-sm text-slate-500">
          Recent launches across every project in your workspace.
        </p>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Recent deployment activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <DeploymentRowSkeleton />
          ) : filteredDeployments.length ? (
            filteredDeployments.map((deployment) => (
              <Link
                key={deployment.id}
                href={`/project/${deployment.projectId}?deployment=${deployment.id}`}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <DeploymentStatusBadge status={deployment.status} />
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-950">{deployment.projectName}</p>
                    <p className="text-sm text-slate-500">
                      {deployment.commitMessage ?? "Manual deployment"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span>{deployment.branch}</span>
                  <span className="font-mono">{deployment.sourceCommitSha?.slice(0, 7) ?? "—"}</span>
                  <span>{formatDuration(deployment.duration)}</span>
                  <span>{formatRelativeTime(deployment.createdAt)}</span>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState
              icon="clock"
              title="No deployments yet"
              description="Trigger your first build from a project page and it will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
