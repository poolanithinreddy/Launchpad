"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { EmptyState } from "@/components/empty-state";
import { DeploymentStatusBadge } from "@/components/deployment-status-badge";
import { ProjectCardSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalytics } from "@/lib/api";
import { formatDuration, formatRelativeTime } from "@/lib/format";

const dateRanges = [7, 30, 90] as const;

function MetricCard({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-4 text-[32px] font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<(typeof dateRanges)[number]>(30);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", days],
    queryFn: () => getAnalytics(days)
  });

  const chartColors = {
    total: "rgb(var(--info))",
    success: "rgb(var(--success))",
    failed: "rgb(var(--failed))",
    building: "rgb(var(--building))"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Analytics</h2>
          <p className="mt-2 text-sm text-slate-500">
            Track deployment volume, build duration, and project health over time.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {dateRanges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                days === range ? "bg-slate-950 text-white" : "text-slate-600"
              }`}
            >
              Last {range} days
            </button>
          ))}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <ProjectCardSkeleton key={index} />)
        ) : (
          <>
            <MetricCard label="Total deployments" value={String(data?.totalDeployments ?? 0)} />
            <MetricCard label="Success rate" value={`${data?.successRate ?? 0}%`} />
            <MetricCard label="Avg build duration" value={formatDuration(data?.avgBuildDuration ?? 0)} />
            <MetricCard label="Total projects" value={String(data?.activeProjects ?? 0)} />
          </>
        )}
      </section>

      <Card className="rounded-[24px]">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Deployments per day</CardTitle>
        </CardHeader>
        <CardContent className="h-[340px]">
          {data?.deploymentsPerDay.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.deploymentsPerDay}>
                <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={chartColors.total}
                  strokeWidth={3}
                  dot={false}
                  name="Total deploys"
                />
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke={chartColors.success}
                  strokeWidth={3}
                  dot={false}
                  name="Successful deploys"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon="clock"
              title="No analytics yet"
              description="Deploy a project and Launchpad will chart the trend here."
              className="h-full border-0 bg-transparent"
            />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[24px]">
          <CardHeader>
            <CardTitle className="text-lg text-slate-950">Build duration per project</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {data?.durationPerProject.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.durationPerProject}>
                  <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="4 4" />
                  <XAxis dataKey="project" tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatDuration(Number(value))} />
                  <Bar dataKey="avgDuration" fill={chartColors.total} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon="clock"
                title="No duration data yet"
                description="Completed deployments will populate this chart."
                className="h-full border-0 bg-transparent"
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardHeader>
            <CardTitle className="text-lg text-slate-950">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {data?.statusBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={110}
                    fill={chartColors.total}
                    label
                  >
                    {data.statusBreakdown.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={getStatusChartColor(entry.status, {
                          successColor: chartColors.success,
                          failedColor: chartColors.failed,
                          buildingColor: chartColors.building,
                          neutralColor: "rgb(var(--muted-foreground))"
                        })}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon="clock"
                title="No status data yet"
                description="Deployment states will appear here once builds start running."
                className="h-full border-0 bg-transparent"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[24px]">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Recent deployments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.recentDeployments.length ? (
            data.recentDeployments.map((deployment) => (
              <div
                key={deployment.id}
                className="grid gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-500 md:grid-cols-[1.4fr,0.8fr,0.8fr,0.8fr,0.9fr]"
              >
                <div>
                  <p className="font-semibold text-slate-950">{deployment.projectName}</p>
                  <p className="mt-1 text-xs text-slate-400">{deployment.branch}</p>
                </div>
                <div>
                  <DeploymentStatusBadge status={deployment.status} />
                </div>
                <div>{formatDuration(deployment.duration)}</div>
                <div className="font-mono">{deployment.sourceCommitSha?.slice(0, 7) ?? "—"}</div>
                <div>{formatRelativeTime(deployment.createdAt)}</div>
              </div>
            ))
          ) : (
            <EmptyState
              icon="clock"
              title="No recent deployments"
              description="Once you start shipping projects, the latest builds will show up here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusChartColor(
  status: string,
  {
    successColor,
    failedColor,
    buildingColor,
    neutralColor
  }: {
    successColor: string;
    failedColor: string;
    buildingColor: string;
    neutralColor: string;
  }
) {
  if (status === "READY") {
    return successColor;
  }

  if (status === "FAILED") {
    return failedColor;
  }

  if (["BUILDING", "STARTING", "CLONING", "DETECTING"].includes(status)) {
    return buildingColor;
  }

  return neutralColor;
}
