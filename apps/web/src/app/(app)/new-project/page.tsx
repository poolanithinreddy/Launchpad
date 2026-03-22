"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FRAMEWORK_OPTIONS } from "@launchpad/types";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeployment, createProject, getGithubReposPage } from "@/lib/api";
import { formatFrameworkLabel, formatRelativeTime } from "@/lib/format";

type DraftEnvVar = {
  key: string;
  value: string;
};

type Step = 1 | 2 | 3;

function ProgressStep({
  step,
  current,
  label
}: {
  step: Step;
  current: Step;
  label: string;
}) {
  const active = step <= current;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
          active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {step}
      </div>
      <span className={active ? "text-sm font-medium text-slate-950" : "text-sm text-slate-400"}>
        {label}
      </span>
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("");
  const [branch, setBranch] = useState("main");
  const [rootDir, setRootDir] = useState(".");
  const [framework, setFramework] = useState("other");
  const [envVars, setEnvVars] = useState<DraftEnvVar[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const reposQuery = useInfiniteQuery({
    queryKey: ["github-repos", "wizard"],
    queryFn: ({ pageParam = 1 }) => getGithubReposPage({ page: pageParam, perPage: 15 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === 15 ? allPages.length + 1 : undefined)
  });

  const repos = useMemo(() => reposQuery.data?.pages.flatMap((page) => page) ?? [], [reposQuery.data]);
  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) ?? null;

  const filteredRepos = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return repos;
    }

    return repos.filter((repo) => {
      return (
        repo.fullName.toLowerCase().includes(query) ||
        repo.name.toLowerCase().includes(query) ||
        (repo.description ?? "").toLowerCase().includes(query) ||
        (repo.language ?? "").toLowerCase().includes(query)
      );
    });
  }, [deferredSearch, repos]);

  const createProjectMutation = useMutation({
    mutationFn: async (input: Parameters<typeof createProject>[0]) => {
      const project = await createProject(input);
      const deployment = await createDeployment(project.id);
      return {
        project,
        deployment
      };
    },
    onSuccess: async ({ project, deployment }) => {
      toast.message("Build started");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] })
      ]);
      router.push(`/project/${project.id}?deployment=${deployment.id}`);
    }
  });

  function addEnvVar() {
    setEnvVars((current) => [...current, { key: "", value: "" }]);
  }

  function updateEnvVar(index: number, field: keyof DraftEnvVar, value: string) {
    setEnvVars((current) =>
      current.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  }

  function removeEnvVar(index: number) {
    setEnvVars((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleSelectRepo(repoId: number) {
    const repo = repos.find((entry) => entry.id === repoId);

    if (!repo) {
      return;
    }

    setSelectedRepoId(repoId);
    setProjectName((current) => current || repo.name);
    setBranch(repo.defaultBranch || "main");
  }

  async function handleDeployNow() {
    setFormError(null);

    if (!selectedRepo) {
      setFormError("Select a repository before creating a project.");
      setStep(1);
      return;
    }

    if (!projectName.trim()) {
      setFormError("Project name is required.");
      setStep(2);
      return;
    }

    const sanitizedEnvVars = envVars.filter((entry) => entry.key.trim() || entry.value.trim());

    if (sanitizedEnvVars.some((entry) => !entry.key.trim())) {
      setFormError("Every environment variable needs a key.");
      setStep(3);
      return;
    }

    await createProjectMutation.mutateAsync({
      name: projectName.trim(),
      repoUrl: selectedRepo.url,
      repoName: selectedRepo.fullName,
      branch: branch.trim() || selectedRepo.defaultBranch || "main",
      framework,
      rootDir: rootDir.trim() || ".",
      envVars: sanitizedEnvVars.map((entry) => ({
        key: entry.key.trim(),
        value: entry.value
      }))
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ProgressStep step={1} current={step} label="Select repository" />
          <ProgressStep step={2} current={step} label="Configure" />
          <ProgressStep step={3} current={step} label="Environment" />
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-950 transition-all duration-150 ease-out"
            style={{
              width: `${(step / 3) * 100}%`
            }}
          />
        </div>
      </div>

      {step === 1 ? (
        <Card className="rounded-[24px]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-slate-950">Step 1 — Select repository</CardTitle>
            <p className="text-sm text-slate-500">
              Pick the GitHub repo Launchpad should connect to and deploy.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search repositories"
              className="bg-slate-50"
            />

            {filteredRepos.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredRepos.map((repo) => {
                  const selected = repo.id === selectedRepoId;

                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => handleSelectRepo(repo.id)}
                      className={`rounded-[20px] border p-5 text-left transition ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950">{repo.fullName}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                            {repo.description ?? "No description provided."}
                          </p>
                        </div>
                        {repo.private ? <Lock className="h-4 w-4 text-slate-400" /> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                          {repo.language ?? "Unknown"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" />
                          {repo.stargazerCount}
                        </span>
                        <span>Updated {formatRelativeTime(repo.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : reposQuery.isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-[20px] border border-slate-200 bg-slate-50" />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="rocket"
                title="No repositories found"
                description="Try a different search term or load more GitHub repositories."
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => reposQuery.fetchNextPage()}
                disabled={!reposQuery.hasNextPage || reposQuery.isFetchingNextPage}
              >
                {reposQuery.isFetchingNextPage ? "Loading more..." : "Load more"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!selectedRepo) {
                    setFormError("Select a repository before continuing.");
                    return;
                  }

                  setStep(2);
                }}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="rounded-[24px]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-slate-950">Step 2 — Configure</CardTitle>
            <p className="text-sm text-slate-500">
              Review the repo settings and tell Launchpad how it should build.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="launchpad-web"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="root-dir">Root directory</Label>
                <Input
                  id="root-dir"
                  value={rootDir}
                  onChange={(event) => setRootDir(event.target.value)}
                  placeholder="."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="framework">Framework</Label>
                <select
                  id="framework"
                  value={framework}
                  onChange={(event) => setFramework(event.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                >
                  {FRAMEWORK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Will deploy from <span className="font-medium text-slate-950">{branch || "main"}</span>{" "}
              branch, <span className="font-medium text-slate-950">{rootDir || "."}</span>{" "}
              directory, using <span className="font-medium text-slate-950">{formatFrameworkLabel(framework)}</span>.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="rounded-[24px]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-slate-950">
              Step 3 — Environment variables
            </CardTitle>
            <p className="text-sm text-slate-500">
              Add any secrets the app needs, or skip this step and deploy immediately.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>Environment variables</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>
                <Plus className="mr-2 h-4 w-4" />
                Add variable
              </Button>
            </div>

            {envVars.length ? (
              <div className="space-y-3">
                {envVars.map((entry, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                    <Input
                      placeholder="KEY"
                      value={entry.key}
                      onChange={(event) => updateEnvVar(index, "key", event.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Value"
                      value={entry.value}
                      onChange={(event) => updateEnvVar(index, "value", event.target.value)}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => removeEnvVar(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="lock"
                title="No environment variables set"
                description="Skip this step if the project does not need secrets yet."
              />
            )}

            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEnvVars([])}>
                  Skip this step
                </Button>
              </div>
              <Button type="button" onClick={() => void handleDeployNow()} disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? "Creating and deploying..." : "Deploy now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
