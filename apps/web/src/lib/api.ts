import type {
  CreateEnvVarInput,
  DeploymentDto,
  CreateProjectInput,
  EnvVarDto,
  GithubRepoDto,
  ProjectDto,
  SessionUser,
  UpdateProjectInput
} from "@launchpad/types";

import { apiClient, unwrapData } from "@/lib/api-client";

export function getSession() {
  return unwrapData<SessionUser>(apiClient.get("/auth/me"));
}

export function logout() {
  return unwrapData<{ success: boolean }>(apiClient.post("/auth/logout"));
}

export function getProjects() {
  return unwrapData<ProjectDto[]>(apiClient.get("/api/projects"));
}

export function getProject(projectId: string) {
  return unwrapData<ProjectDto>(apiClient.get(`/api/projects/${projectId}`));
}

export function createProject(input: CreateProjectInput) {
  return unwrapData<ProjectDto>(apiClient.post("/api/projects", input));
}

export function updateProject({
  projectId,
  input
}: {
  projectId: string;
  input: UpdateProjectInput;
}) {
  return unwrapData<ProjectDto>(apiClient.put(`/api/projects/${projectId}`, input));
}

export function deleteProject(projectId: string) {
  return unwrapData<{ success: boolean }>(apiClient.delete(`/api/projects/${projectId}`));
}

export function getProjectEnvVars(projectId: string) {
  return unwrapData<EnvVarDto[]>(apiClient.get(`/api/projects/${projectId}/env`));
}

export function createProjectEnvVar({
  projectId,
  input
}: {
  projectId: string;
  input: CreateEnvVarInput;
}) {
  return unwrapData<EnvVarDto>(apiClient.post(`/api/projects/${projectId}/env`, input));
}

export function deleteProjectEnvVar({
  projectId,
  envId
}: {
  projectId: string;
  envId: string;
}) {
  return unwrapData<{ success: boolean }>(
    apiClient.delete(`/api/projects/${projectId}/env/${envId}`)
  );
}

export function getGithubRepos() {
  return unwrapData<GithubRepoDto[]>(apiClient.get("/api/github/repos"));
}

export function getProjectDeployments(projectId: string) {
  return unwrapData<DeploymentDto[]>(apiClient.get(`/api/projects/${projectId}/deployments`));
}

export function createDeployment(projectId: string) {
  return unwrapData<DeploymentDto>(apiClient.post(`/api/projects/${projectId}/deployments`));
}
