export type ApiErrorResponse = {
  error: string;
  code: string;
};

export type ApiSuccessResponse<T> = {
  data: T;
};

export type SessionUser = {
  id: string;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type EnvVarDto = {
  id: string;
  key: string;
  value: string;
  projectId: string;
};

export const DEPLOYMENT_STATUSES = [
  "QUEUED",
  "CLONING",
  "DETECTING",
  "BUILDING",
  "STARTING",
  "READY",
  "FAILED",
  "STOPPED"
] as const;

export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export type DeploymentDto = {
  id: string;
  status: DeploymentStatus;
  previewUrl: string | null;
  previewPort: number | null;
  framework: string;
  sourceCommitSha: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  projectId: string;
};

export type ProjectDto = {
  id: string;
  name: string;
  repoUrl: string;
  repoName: string;
  branch: string;
  framework: string;
  rootDir: string;
  liveUrl: string | null;
  webhookSecret: string;
  createdAt: string;
  userId: string;
  envVars?: EnvVarDto[];
  envVarCount?: number;
  latestDeployment?: DeploymentDto | null;
  deploymentCount?: number;
};

export type GithubRepoDto = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  private: boolean;
  updatedAt: string;
};

export type CreateEnvVarInput = {
  key: string;
  value: string;
};

export type CreateProjectInput = {
  name: string;
  repoUrl: string;
  repoName: string;
  branch?: string;
  framework?: string;
  rootDir?: string;
  envVars?: CreateEnvVarInput[];
};

export type UpdateProjectInput = {
  name?: string;
  branch?: string;
  framework?: string;
  rootDir?: string;
  liveUrl?: string | null;
};

export type CreateDeploymentInput = {
  rebuild?: boolean;
};

export const FRAMEWORK_OPTIONS = [
  { label: "Other", value: "other" },
  { label: "Next.js", value: "nextjs" },
  { label: "React", value: "react" },
  { label: "Node.js", value: "node" }
] as const;
