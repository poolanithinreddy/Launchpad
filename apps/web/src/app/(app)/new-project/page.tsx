"use client";

import { FormEvent, useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { FRAMEWORK_OPTIONS } from "@launchpad/types";

import { RepoPicker } from "@/components/repo-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, getGithubRepos } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";

type DraftEnvVar = {
  key: string;
  value: string;
};

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedRepoName, setSelectedRepoName] = useState<string>("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("main");
  const [framework, setFramework] = useState("other");
  const [rootDir, setRootDir] = useState(".");
  const [envVars, setEnvVars] = useState<DraftEnvVar[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: repos, isLoading, error } = useQuery({
    queryKey: ["github-repos"],
    queryFn: getGithubRepos
  });

  const selectedRepo = repos?.find((repo) => repo.fullName === selectedRepoName) ?? null;

  const filteredRepos = !repos
    ? []
    : (() => {
        const query = deferredSearch.trim().toLowerCase();

        if (!query) {
          return repos;
        }

        return repos.filter((repo) => {
          return (
            repo.fullName.toLowerCase().includes(query) ||
            repo.name.toLowerCase().includes(query)
          );
        });
      })();

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/project/${project.id}`);
    }
  });

  function addEnvVarField() {
    setEnvVars((current) => [...current, { key: "", value: "" }]);
  }

  function updateEnvVar(index: number, field: keyof DraftEnvVar, value: string) {
    setEnvVars((current) =>
      current.map((envVar, currentIndex) =>
        currentIndex === index ? { ...envVar, [field]: value } : envVar
      )
    );
  }

  function removeEnvVar(index: number) {
    setEnvVars((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!selectedRepo) {
      setFormError("Select a GitHub repository before creating a project.");
      return;
    }

    const sanitizedEnvVars = envVars.filter((envVar) => envVar.key.trim() || envVar.value.trim());

    if (sanitizedEnvVars.some((envVar) => !envVar.key.trim())) {
      setFormError("Every environment variable must include a key.");
      return;
    }

    await createProjectMutation.mutateAsync({
      name: name.trim(),
      repoUrl: selectedRepo.url,
      repoName: selectedRepo.fullName,
      branch: branch.trim() || selectedRepo.defaultBranch || "main",
      framework,
      rootDir: rootDir.trim() || ".",
      envVars: sanitizedEnvVars.map((envVar) => ({
        key: envVar.key.trim(),
        value: envVar.value
      }))
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
      <Card className="border border-slate-200 bg-white shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-slate-900">Import a repository</CardTitle>
          <CardDescription className="text-slate-600">
            Select a GitHub repository and configure the first Launchpad project settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepoPicker
            search={search}
            onSearchChange={setSearch}
            repos={filteredRepos}
            selectedRepoName={selectedRepoName}
            onSelectRepo={(repo) => {
              setSelectedRepoName(repo.fullName);
              setBranch(repo.defaultBranch || "main");
              setName((current) => current || repo.name);
            }}
            isLoading={isLoading}
            error={error ? getApiErrorMessage(error, "GitHub repositories could not be loaded.") : null}
          />
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-slate-900">Project configuration</CardTitle>
          <CardDescription className="text-slate-600">
            Fine-tune the branch, framework, root directory, and optional environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="launchpad-web"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repo">Repository</Label>
              <Input id="repo" value={selectedRepo?.fullName ?? "No repository selected"} readOnly />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="framework">Framework</Label>
                <select
                  id="framework"
                  value={framework}
                  onChange={(event) => setFramework(event.target.value)}
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
              <Label htmlFor="root-dir">Root directory</Label>
              <Input
                id="root-dir"
                value={rootDir}
                onChange={(event) => setRootDir(event.target.value)}
                placeholder="."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Environment variables</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEnvVarField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add variable
                </Button>
              </div>

              {envVars.length ? (
                <div className="space-y-3">
                  {envVars.map((envVar, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                      <Input
                        placeholder="KEY"
                        value={envVar.key}
                        onChange={(event) => updateEnvVar(index, "key", event.target.value)}
                      />
                      <Input
                        placeholder="value"
                        value={envVar.value}
                        onChange={(event) => updateEnvVar(index, "value", event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEnvVar(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No environment variables yet.
                </div>
              )}
            </div>

            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            {createProjectMutation.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {getApiErrorMessage(createProjectMutation.error, "Project could not be created.")}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? "Creating project..." : "Create project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
