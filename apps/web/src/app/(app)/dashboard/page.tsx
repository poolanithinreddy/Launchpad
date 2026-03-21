"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/empty-state";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";

export default function DashboardPage() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Projects</h1>
          <p className="text-sm text-slate-600">
            Import GitHub repositories and manage the foundation for future deployments.
          </p>
        </div>
        <Button asChild>
          <Link href="/new-project">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Projects could not be loaded.")}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && projects?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : null}

      {!isLoading && !projects?.length ? (
        <EmptyState
          title="No projects yet"
          description="Create your first Launchpad project by importing a repository from GitHub."
          action={
            <Button asChild>
              <Link href="/new-project">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
