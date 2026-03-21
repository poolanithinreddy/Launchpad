"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { FRAMEWORK_OPTIONS } from "@launchpad/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProjectEnvVar,
  deleteProject,
  deleteProjectEnvVar,
  getProject,
  getProjectEnvVars,
  updateProject
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";

type ProjectSettingsPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => getProject(params.id)
  });

  const { data: envVars, error: envError } = useQuery({
    queryKey: ["project-env", params.id],
    queryFn: () => getProjectEnvVars(params.id)
  });

  const updateMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] })
      ]);
    }
  });

  const addEnvMutation = useMutation({
    mutationFn: createProjectEnvVar,
    onSuccess: async () => {
      setNewEnvKey("");
      setNewEnvValue("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["project-env", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] })
      ]);
    }
  });

  const deleteEnvMutation = useMutation({
    mutationFn: deleteProjectEnvVar,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["project-env", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] })
      ]);
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/dashboard");
    }
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />;
  }

  if (error || !project) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {getApiErrorMessage(error, "Project settings could not be loaded.")}
      </div>
    );
  }

  async function handleProjectUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await updateMutation.mutateAsync({
      projectId: params.id,
      input: {
        name: String(formData.get("name") ?? "").trim(),
        branch: String(formData.get("branch") ?? "").trim(),
        framework: String(formData.get("framework") ?? "").trim(),
        rootDir: String(formData.get("rootDir") ?? "").trim()
      }
    });
  }

  async function handleAddEnvVar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await addEnvMutation.mutateAsync({
      projectId: params.id,
      input: {
        key: newEnvKey.trim(),
        value: newEnvValue
      }
    });
  }

  async function handleDeleteProject() {
    if (!project) {
      return;
    }

    const confirmed = window.confirm(`Delete ${project.name}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    await deleteProjectMutation.mutateAsync(params.id);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Project settings</h1>
        <p className="text-sm text-slate-600">
          Update project metadata and manage environment variables for {project.name}.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="border border-slate-200 bg-white shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-slate-900">General</CardTitle>
            <CardDescription className="text-slate-600">
              Repository details are fixed for Phase 1. You can still update the runtime settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleProjectUpdate}>
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" name="name" defaultValue={project.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repoName">Repository</Label>
                <Input id="repoName" value={project.repoName} readOnly />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input id="branch" name="branch" defaultValue={project.branch} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="framework">Framework</Label>
                  <select
                    id="framework"
                    name="framework"
                    defaultValue={project.framework}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    {FRAMEWORK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rootDir">Root directory</Label>
                <Input id="rootDir" name="rootDir" defaultValue={project.rootDir} required />
              </div>

              {updateMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {getApiErrorMessage(updateMutation.error, "Project settings could not be saved.")}
                </div>
              ) : null}

              {updateMutation.isSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Project settings saved.
                </div>
              ) : null}

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-slate-900">Environment variables</CardTitle>
            <CardDescription className="text-slate-600">
              Add or remove environment variables stored for this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="grid gap-3" onSubmit={handleAddEnvVar}>
              <Input
                placeholder="KEY"
                value={newEnvKey}
                onChange={(event) => setNewEnvKey(event.target.value)}
                required
              />
              <Input
                placeholder="value"
                value={newEnvValue}
                onChange={(event) => setNewEnvValue(event.target.value)}
                required
              />
              <Button type="submit" disabled={addEnvMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {addEnvMutation.isPending ? "Adding..." : "Add variable"}
              </Button>
            </form>

            {addEnvMutation.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {getApiErrorMessage(addEnvMutation.error, "Environment variable could not be added.")}
              </div>
            ) : null}

            {envError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {getApiErrorMessage(envError, "Environment variables could not be loaded.")}
              </div>
            ) : null}

            <div className="space-y-3">
              {envVars?.length ? (
                envVars.map((envVar) => (
                  <div
                    key={envVar.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{envVar.key}</p>
                      <p className="truncate text-sm text-slate-500">{envVar.value}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={deleteEnvMutation.isPending}
                      onClick={() =>
                        deleteEnvMutation.mutate({
                          projectId: params.id,
                          envId: envVar.id
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No environment variables configured yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-red-200 bg-white shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-red-700">Danger zone</CardTitle>
          <CardDescription className="text-slate-600">
            Deleting this project removes its configuration and environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-600">This action cannot be undone.</p>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteProject}
            disabled={deleteProjectMutation.isPending}
          >
            {deleteProjectMutation.isPending ? "Deleting..." : "Delete project"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
