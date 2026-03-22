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

export const BUILD_LOG_LEVELS = ["info", "success", "error", "warn"] as const;

export type BuildLogLevel = (typeof BUILD_LOG_LEVELS)[number];

export type BuildLogLineDto = {
  timestamp: string;
  text: string;
  level: BuildLogLevel;
};

export type WebhookInfoDto = {
  webhookUrl: string;
  webhookSecret: string;
  events: string[];
};

export type FailureAnalysisDto = {
  summary: string;
  cause: string;
  fix: string;
  severity: "low" | "medium" | "high";
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
  sourceBranch: string | null;
  sourceCommitSha: string | null;
  commitMessage: string | null;
  errorMessage: string | null;
  aiAnalysis: string | null;
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
  description: string | null;
  language: string | null;
  stargazerCount: number;
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

export type AnalyticsDailyDeploymentDto = {
  date: string;
  total: number;
  success: number;
};

export type AnalyticsDurationPerProjectDto = {
  project: string;
  avgDuration: number;
};

export type AnalyticsStatusBreakdownDto = {
  status: DeploymentStatus;
  count: number;
};

export type AnalyticsRecentDeploymentDto = DeploymentDto & {
  projectName: string;
  branch: string;
  duration: number | null;
};

export type AnalyticsDto = {
  totalDeployments: number;
  successRate: number;
  avgBuildDuration: number;
  activeProjects: number;
  deploymentsPerDay: AnalyticsDailyDeploymentDto[];
  durationPerProject: AnalyticsDurationPerProjectDto[];
  statusBreakdown: AnalyticsStatusBreakdownDto[];
  recentDeployments: AnalyticsRecentDeploymentDto[];
};

export const FRAMEWORK_OPTIONS = [
  { label: "Auto-detect", value: "other" },
  { label: "Next.js", value: "nextjs" },
  { label: "React", value: "react" },
  { label: "Python", value: "python" },
  { label: "Node.js", value: "node" },
  { label: "Static", value: "static" }
] as const;
