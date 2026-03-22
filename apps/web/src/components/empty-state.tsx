import { Clock3, Lock, Rocket, Terminal } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const illustrations = {
  rocket: Rocket,
  clock: Clock3,
  terminal: Terminal,
  lock: Lock
} as const;

export function EmptyState({
  title,
  description,
  action,
  icon = "rocket",
  className
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: keyof typeof illustrations;
  className?: string;
}) {
  const Icon = illustrations[icon];

  return (
    <Card className={cn("rounded-[28px] border border-dashed border-slate-200 bg-slate-50", className)}>
      <CardContent className="flex flex-col items-center gap-5 px-8 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Icon className="h-7 w-7 text-slate-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="max-w-xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
