import type { DeploymentStatus } from "@launchpad/types";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<DeploymentStatus, string> = {
  QUEUED: "border-slate-200 bg-slate-100 text-slate-700",
  CLONING: "border-amber-200 bg-amber-50 text-amber-700",
  DETECTING: "border-amber-200 bg-amber-50 text-amber-700",
  BUILDING: "border-amber-200 bg-amber-50 text-amber-700",
  STARTING: "border-amber-200 bg-amber-50 text-amber-700",
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  STOPPED: "border-slate-200 bg-slate-100 text-slate-700"
};

export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", statusStyles[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
