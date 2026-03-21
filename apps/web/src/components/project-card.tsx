import Link from "next/link";
import { ExternalLink, Rocket, Settings } from "lucide-react";
import type { ProjectDto } from "@launchpad/types";

import { DeploymentStatusBadge } from "@/components/deployment-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function ProjectCard({ project }: { project: ProjectDto }) {
  return (
    <Card className="border border-slate-200 bg-white shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg text-slate-900">{project.name}</CardTitle>
            <p className="text-sm text-slate-500">{project.repoName}</p>
          </div>
          <Badge variant="secondary">{project.framework}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Branch</p>
            <p className="mt-2 font-medium text-slate-900">{project.branch}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Env vars</p>
            <p className="mt-2 font-medium text-slate-900">{project.envVarCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deployment</p>
            <div className="mt-2">
              {project.latestDeployment ? (
                <DeploymentStatusBadge status={project.latestDeployment.status} />
              ) : (
                <p className="font-medium text-slate-900">None</p>
              )}
            </div>
          </div>
        </div>
        <p className="truncate text-slate-500">{project.rootDir}</p>
        {project.liveUrl ? (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-600"
          >
            <Rocket className="mr-2 h-4 w-4" />
            Open preview
          </a>
        ) : null}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/project/${project.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/project/${project.id}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
