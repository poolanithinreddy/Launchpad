"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAppShellSearch } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ProjectCard } from "@/components/project-card";
import { ProjectCardSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/api";

export default function ProjectsPage() {
  const { query } = useAppShellSearch();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects
  });

  const filteredProjects =
    projects?.filter((project) => {
      const search = query.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return (
        project.name.toLowerCase().includes(search) ||
        project.repoName.toLowerCase().includes(search) ||
        project.branch.toLowerCase().includes(search)
      );
    }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h2>
          <p className="mt-2 text-sm text-slate-500">
            Every connected repository, ready to deploy or inspect.
          </p>
        </div>
        <Button asChild>
          <Link href="/new-project">
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredProjects.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="rocket"
          title="No matching projects"
          description="Try a different search or import a fresh repository from GitHub."
          action={
            <Button asChild>
              <Link href="/new-project">Import a repo</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
