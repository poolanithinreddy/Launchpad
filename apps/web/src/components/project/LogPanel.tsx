"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Copy, LoaderCircle, Radio } from "lucide-react";
import type { DeploymentStatus } from "@launchpad/types";
import { toast } from "sonner";

import { useDeploymentLogs } from "@/hooks/useDeploymentLogs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const lineStyles = {
  info: "text-slate-300",
  success: "text-emerald-400",
  error: "text-red-400",
  warn: "text-amber-400"
} as const;

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(timestamp));
}

export function LogPanel({
  deploymentId,
  initialStatus,
  previewUrl,
  onStatusChange
}: {
  deploymentId: string;
  initialStatus: DeploymentStatus;
  previewUrl?: string | null;
  onStatusChange?: (status: DeploymentStatus | null) => void;
}) {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previousStatusRef = useRef<DeploymentStatus | null>(initialStatus);
  const { logs, status, isLive } = useDeploymentLogs({
    deploymentId,
    initialStatus
  });

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    if (!status || status === previousStatus) {
      previousStatusRef.current = status;
      return;
    }

    if (status === "READY") {
      const confettiEnd = Date.now() + 2_000;
      const styles = window.getComputedStyle(document.documentElement);
      const confettiColors = ["--success", "--info", "--building"].map((token) => {
        const value = styles.getPropertyValue(token).trim();
        return `rgb(${value})`;
      });

      const launchConfetti = () => {
        confetti({
          particleCount: 120,
          spread: 70,
          colors: confettiColors
        });

        if (Date.now() < confettiEnd) {
          window.setTimeout(launchConfetti, 400);
        }
      };

      launchConfetti();
      toast.success("Deployment ready! 🚀", {
        action: previewUrl
          ? {
              label: "Open preview",
              onClick: () => {
                window.open(previewUrl, "_blank", "noopener,noreferrer");
              }
            }
          : undefined
      });
    }

    if (status === "FAILED") {
      toast.error("Build failed");
    }

    previousStatusRef.current = status;
  }, [previewUrl, status]);

  useEffect(() => {
    if (!autoScroll || !scrollContainerRef.current) {
      return;
    }

    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [autoScroll, logs]);

  const logText = useMemo(() => {
    return logs.map((line) => `[${formatTime(line.timestamp)}] ${line.text}`).join("\n");
  }, [logs]);

  const isComplete = status === "READY" || status === "FAILED";
  const showLive = isLive && !isComplete;

  async function handleCopyLogs() {
    if (!logText) {
      return;
    }

    await navigator.clipboard.writeText(logText);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {showLive ? (
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            ) : (
              <Radio className="h-3.5 w-3.5 text-slate-500" />
            )}
            {showLive ? "Live" : "Offline"}
          </div>
          {isComplete ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Build complete
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(event) => setAutoScroll(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-slate-100"
            />
            Auto-scroll
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
            onClick={() => {
              void handleCopyLogs();
            }}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy logs
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="h-[400px] overflow-y-auto rounded-xl bg-slate-950 font-mono text-xs"
      >
        {logs.length ? (
          <div className="space-y-1">
            {logs.map((line, index) => (
              <div
                key={`${line.timestamp}-${index}`}
                className="flex items-start gap-3 rounded-lg px-1 py-0.5"
              >
                <span className="shrink-0 text-slate-500">[{formatTime(line.timestamp)}]</span>
                <span className={cn("whitespace-pre-wrap break-words", lineStyles[line.level])}>
                  {line.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <p>Waiting for logs...</p>
          </div>
        )}
      </div>

      {isComplete ? (
        <p className={cn("text-sm", status === "READY" ? "text-emerald-400" : "text-red-400")}>
          {status === "READY"
            ? "Build complete. Your preview is ready."
            : "Build complete. The deployment failed."}
        </p>
      ) : null}
    </div>
  );
}
