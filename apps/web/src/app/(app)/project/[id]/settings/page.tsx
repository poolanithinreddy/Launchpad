"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FRAMEWORK_OPTIONS } from "@launchpad/types";

import { EmptyState } from "@/components/empty-state";
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
  getWebhookInfo,
  rotateWebhookSecret,
  updateProject
} from "@/lib/api";

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
  const [showSecret, setShowSecret] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => getProject(params.id)
  });
  const { data: envVars } = useQuery({
    queryKey: ["project-env", params.id],
    queryFn: () => getProjectEnvVars(params.id)
  });
  const { data: webhookInfo } = useQuery({
    queryKey: ["project-webhook", params.id],
    queryFn: () => getWebhookInfo(params.id)
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
        queryClient.invalidateQueries({ queryKey: ["project-env", params.id] })
      ]);
    }
  });

  const rotateSecretMutation = useMutation({
    mutationFn: rotateWebhookSecret,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-webhook", params.id] });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      toast.message("Project deleted");
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/dashboard");
    }
  });

  if (isLoading || !project) {
    return <div className="h-72 animate-pulse rounded-[24px] border border-slate-200 bg-white" />;
  }

  async function handleUpdateProject(event: FormEvent<HTMLFormElement>) {
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

    const confirmed = window.confirm(`Delete ${project.name}? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    await deleteProjectMutation.mutateAsync(params.id);
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.message("Copied to clipboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Project settings</h2>
        <p className="mt-2 text-sm text-slate-500">
          Update runtime settings, secrets, and webhook configuration for {project.name}.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="rounded-[24px]">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">General</CardTitle>
            <CardDescription>Update the runtime shape of this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={(event) => void handleUpdateProject(event)}>
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" name="name" defaultValue={project.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repoName">Repository</Label>
                <Input id="repoName" value={project.repoName} readOnly />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input id="branch" name="branch" defaultValue={project.branch} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="framework">Framework</Label>
                  <select
                    id="framework"
                    name="framework"
                    defaultValue={project.framework}
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
              <div className="space-y-2">
                <Label htmlFor="rootDir">Root directory</Label>
                <Input id="rootDir" name="rootDir" defaultValue={project.rootDir} />
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">Environment variables</CardTitle>
            <CardDescription>Store project-level secrets for every deployment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="grid gap-3" onSubmit={(event) => void handleAddEnvVar(event)}>
              <Input
                placeholder="KEY"
                value={newEnvKey}
                onChange={(event) => setNewEnvKey(event.target.value)}
              />
              <Input
                placeholder="Value"
                type="password"
                value={newEnvValue}
                onChange={(event) => setNewEnvValue(event.target.value)}
              />
              <Button type="submit" disabled={addEnvMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                Add variable
              </Button>
            </form>

            {envVars?.length ? (
              <div className="space-y-3">
                {envVars.map((envVar) => (
                  <div
                    key={envVar.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{envVar.key}</p>
                      <p className="truncate text-sm text-slate-500">{envVar.value}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
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
                ))}
              </div>
            ) : (
              <EmptyState
                icon="lock"
                title="No environment variables set"
                description="Add keys here when your project needs API tokens, secrets, or config."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader>
          <CardTitle className="text-xl text-slate-950">Webhook</CardTitle>
          <CardDescription>
            Connect GitHub push events to Launchpad so new commits deploy automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex gap-3">
                <Input id="webhook-url" value={webhookInfo?.webhookUrl ?? ""} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => webhookInfo && void handleCopy(webhookInfo.webhookUrl)}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook secret</Label>
              <div className="flex gap-3">
                <Input
                  id="webhook-secret"
                  type={showSecret ? "text" : "password"}
                  value={webhookInfo?.webhookSecret ?? ""}
                  readOnly
                />
                <Button type="button" variant="outline" onClick={() => setShowSecret((current) => !current)}>
                  {showSecret ? "Hide" : "Reveal"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
            <ol className="space-y-2 text-sm text-slate-600">
              <li>1. Go to your GitHub repo → Settings → Webhooks → Add webhook</li>
              <li>2. Paste the URL above into Payload URL</li>
              <li>3. Set Content-Type to application/json</li>
              <li>4. Paste the secret above into Secret</li>
              <li>5. Select &quot;Just the push event&quot;</li>
              <li>6. Click Add webhook</li>
            </ol>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => rotateSecretMutation.mutate(params.id)}
            disabled={rotateSecretMutation.isPending}
          >
            {rotateSecretMutation.isPending ? "Regenerating..." : "Regenerate secret"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-red-200">
        <CardHeader>
          <CardTitle className="text-xl text-red-700">Danger zone</CardTitle>
          <CardDescription>Delete the project, its deployments, and its stored configuration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">This action cannot be undone.</p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDeleteProject()}
            disabled={deleteProjectMutation.isPending}
          >
            {deleteProjectMutation.isPending ? "Deleting..." : "Delete project"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
