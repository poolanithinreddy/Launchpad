"use client";

import { AlertTriangle } from "lucide-react";
import type { DeploymentDto, FailureAnalysisDto } from "@launchpad/types";

import { Badge } from "@/components/ui/badge";

function parseAnalysis(analysis: string): FailureAnalysisDto | null {
  try {
    const parsed = JSON.parse(analysis) as Partial<FailureAnalysisDto>;

    if (
      typeof parsed.summary === "string" &&
      typeof parsed.cause === "string" &&
      typeof parsed.fix === "string" &&
      typeof parsed.severity === "string"
    ) {
      return {
        summary: parsed.summary,
        cause: parsed.cause,
        fix: parsed.fix,
        severity: parsed.severity as FailureAnalysisDto["severity"]
      };
    }
  } catch {
    return null;
  }

  return null;
}

function severityClassName(severity: FailureAnalysisDto["severity"]) {
  switch (severity) {
    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "high":
      return "border-red-200 bg-red-100 text-red-700";
    case "medium":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export function AIAnalysisCard({ deployment }: { deployment: DeploymentDto }) {
  if (deployment.status !== "FAILED" || !deployment.aiAnalysis) {
    return null;
  }

  const parsed = parseAnalysis(deployment.aiAnalysis);

  return (
    <div className="animate-fade-in rounded-[24px] border border-red-200 bg-red-50 p-5">
      <div className="flex flex-col gap-3 border-b border-red-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Build Failed — AI Analysis</h3>
            <p className="text-sm text-red-700/80">A deployment assistant reviewed the last build logs.</p>
          </div>
        </div>
        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
          Powered by OpenAI
        </Badge>
      </div>

      {parsed ? (
        <div className="mt-5 space-y-5">
          <section className="space-y-2">
            <p className="text-sm font-medium text-slate-500">What went wrong</p>
            <p className="font-semibold text-red-800">{parsed.summary}</p>
          </section>
          <section className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Root cause</p>
            <p className="text-sm leading-6 text-slate-700">{parsed.cause}</p>
          </section>
          <section className="space-y-2 border-l-2 border-emerald-300 pl-4">
            <p className="text-sm font-medium text-slate-500">How to fix it</p>
            <p className="text-sm leading-6 text-slate-700">{parsed.fix}</p>
          </section>
          <section className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Severity</p>
            <Badge variant="outline" className={severityClassName(parsed.severity)}>
              {parsed.severity}
            </Badge>
          </section>
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-slate-700">{deployment.aiAnalysis}</p>
      )}
    </div>
  );
}
