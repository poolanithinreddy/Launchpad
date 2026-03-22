import type { DeploymentStatus } from "@launchpad/types";

const activeStatuses: DeploymentStatus[] = ["QUEUED", "CLONING", "DETECTING", "BUILDING", "STARTING"];

export function isActiveDeploymentStatus(status: DeploymentStatus) {
  return activeStatuses.includes(status);
}

export function formatFrameworkLabel(framework: string) {
  switch (framework) {
    case "nextjs":
      return "Next.js";
    case "react":
      return "React";
    case "python":
      return "Python";
    case "node":
      return "Node.js";
    case "static":
      return "Static";
    case "other":
      return "Auto";
    default:
      return framework;
  }
}

export function frameworkBadgeClassName(framework: string) {
  switch (framework) {
    case "nextjs":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "react":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "python":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "node":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "static":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function statusDotClassName(status: DeploymentStatus) {
  switch (status) {
    case "READY":
      return "bg-emerald-500";
    case "FAILED":
      return "bg-red-500";
    case "QUEUED":
      return "bg-slate-400";
    case "CLONING":
    case "DETECTING":
    case "BUILDING":
    case "STARTING":
      return "bg-amber-500";
    case "STOPPED":
    default:
      return "bg-slate-400";
  }
}

export function formatRelativeTime(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", {
    numeric: "auto"
  });

  const units = [
    { unit: "day", ms: 24 * 60 * 60 * 1000 },
    { unit: "hour", ms: 60 * 60 * 1000 },
    { unit: "minute", ms: 60 * 1000 },
    { unit: "second", ms: 1000 }
  ] as const;

  for (const { unit, ms } of units) {
    if (absMs >= ms || unit === "second") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }

  return "just now";
}

export function formatDuration(durationMs: number | null) {
  if (durationMs === null || Number.isNaN(durationMs)) {
    return "—";
  }

  const totalSeconds = Math.max(Math.floor(durationMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getDeploymentDuration({
  startedAt,
  completedAt
}: {
  startedAt: string | null;
  completedAt: string | null;
}) {
  if (!startedAt) {
    return null;
  }

  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();

  return end - start;
}
