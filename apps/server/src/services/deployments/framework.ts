import { existsSync } from "fs";
import { access, readFile } from "fs/promises";
import path from "path";

import { ApiError } from "../../lib/api-error";

type PackageManager = "npm" | "pnpm" | "yarn";
type SupportedFramework = "nextjs" | "react" | "node";

type PackageJson = {
  scripts?: Record<string, string | undefined>;
  dependencies?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
};

export type BuildPlan = {
  framework: SupportedFramework;
  packageManager: PackageManager;
  workingDirectory: string;
  installCommand: string;
  buildCommand: string | null;
  startCommand: string;
  runtimeType: "node" | "static";
  outputDirectory: string | null;
  containerPort: number;
};

function getPackageManager(projectRoot: string): PackageManager {
  if (existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (existsSync(path.join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }

  return "npm";
}

function getInstallCommand(packageManager: PackageManager) {
  switch (packageManager) {
    case "pnpm":
      return "corepack enable && pnpm install --frozen-lockfile";
    case "yarn":
      return "corepack enable && (yarn install --frozen-lockfile || yarn install --immutable)";
    case "npm":
    default:
      return "if [ -f package-lock.json ]; then npm ci; else npm install; fi";
  }
}

function runPackageScript(packageManager: PackageManager, script: string) {
  switch (packageManager) {
    case "pnpm":
      return `pnpm run ${script}`;
    case "yarn":
      return `yarn ${script}`;
    case "npm":
    default:
      return `npm run ${script}`;
  }
}

export function resolveRootDirectory(repositoryRoot: string, rootDir: string) {
  const normalizedRootDir = rootDir === "." ? "." : rootDir.replace(/^\.?\//, "").replace(/\/$/, "");
  const resolvedRoot = path.resolve(repositoryRoot, normalizedRootDir === "." ? "." : normalizedRootDir);
  const relativePath = path.relative(repositoryRoot, resolvedRoot);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new ApiError(400, "INVALID_ROOT_DIR", "Project root directory is invalid.");
  }

  return {
    resolvedRoot,
    normalizedRootDir
  };
}

export async function detectBuildPlan({
  repositoryRoot,
  rootDir,
  configuredFramework
}: {
  repositoryRoot: string;
  rootDir: string;
  configuredFramework: string;
}): Promise<BuildPlan> {
  const { resolvedRoot, normalizedRootDir } = resolveRootDirectory(repositoryRoot, rootDir);
  const packageJsonPath = path.join(resolvedRoot, "package.json");

  try {
    await access(packageJsonPath);
  } catch {
    throw new ApiError(
      400,
      "UNSUPPORTED_FRAMEWORK",
      "Launchpad could not find a package.json in the configured root directory."
    );
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as PackageJson;
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  const scripts = packageJson.scripts ?? {};
  const packageManager = getPackageManager(resolvedRoot);
  const preferredFramework = configuredFramework.toLowerCase();

  const hasNext =
    Boolean(dependencies.next) ||
    scripts.build?.includes("next build") ||
    scripts.start?.includes("next start");
  const hasReact = Boolean(dependencies.react) || Boolean(dependencies["react-dom"]);
  const hasVite = Boolean(dependencies.vite) || scripts.build?.includes("vite build");
  const hasReactScripts =
    Boolean(dependencies["react-scripts"]) || scripts.build?.includes("react-scripts build");

  if (hasNext || preferredFramework === "nextjs") {
    if (!scripts.build || !scripts.start) {
      throw new ApiError(
        400,
        "UNSUPPORTED_FRAMEWORK",
        "Next.js deployments require both build and start scripts."
      );
    }

    return {
      framework: "nextjs",
      packageManager,
      workingDirectory: normalizedRootDir,
      installCommand: getInstallCommand(packageManager),
      buildCommand: runPackageScript(packageManager, "build"),
      startCommand: `${packageManager === "npm" ? "" : "corepack enable && "}HOSTNAME=0.0.0.0 PORT=3000 ${runPackageScript(packageManager, "start")}`.trim(),
      runtimeType: "node",
      outputDirectory: null,
      containerPort: 3000
    };
  }

  if ((hasReact && (hasVite || hasReactScripts)) || preferredFramework === "react") {
    if (!scripts.build) {
      throw new ApiError(
        400,
        "UNSUPPORTED_FRAMEWORK",
        "React deployments require a build script."
      );
    }

    return {
      framework: "react",
      packageManager,
      workingDirectory: normalizedRootDir,
      installCommand: getInstallCommand(packageManager),
      buildCommand: runPackageScript(packageManager, "build"),
      startCommand: "serve -s /app/public -l 3000",
      runtimeType: "static",
      outputDirectory: hasReactScripts ? "build" : "dist",
      containerPort: 3000
    };
  }

  if (scripts.start || preferredFramework === "node") {
    return {
      framework: "node",
      packageManager,
      workingDirectory: normalizedRootDir,
      installCommand: getInstallCommand(packageManager),
      buildCommand: scripts.build ? runPackageScript(packageManager, "build") : null,
      startCommand: `${packageManager === "npm" ? "" : "corepack enable && "}PORT=3000 ${runPackageScript(packageManager, "start")}`.trim(),
      runtimeType: "node",
      outputDirectory: null,
      containerPort: 3000
    };
  }

  throw new ApiError(
    400,
    "UNSUPPORTED_FRAMEWORK",
    "Launchpad currently supports Next.js, React static builds, and Node.js projects with a start script."
  );
}

export function createDockerfile(plan: BuildPlan) {
  const workingDirectory = plan.workingDirectory === "." ? "/workspace" : `/workspace/${plan.workingDirectory}`;

  const builderLines = [
    "FROM node:20-alpine AS builder",
    "WORKDIR /workspace",
    "COPY . .",
    `WORKDIR ${workingDirectory}`,
    `RUN ${plan.installCommand}`
  ];

  if (plan.buildCommand) {
    builderLines.push(`RUN ${plan.buildCommand}`);
  }

  if (plan.runtimeType === "static") {
    builderLines.push("", "FROM node:20-alpine AS runner", "WORKDIR /app", "RUN npm install -g serve");
    builderLines.push(`COPY --from=builder ${workingDirectory}/${plan.outputDirectory} ./public`);
    builderLines.push(`EXPOSE ${plan.containerPort}`);
    builderLines.push(`CMD ["sh", "-c", "${plan.startCommand}"]`);
    return `${builderLines.join("\n")}\n`;
  }

  builderLines.push("", "FROM node:20-alpine AS runner", "WORKDIR /app", "COPY --from=builder /workspace /app");
  builderLines.push(`WORKDIR /app${plan.workingDirectory === "." ? "" : `/${plan.workingDirectory}`}`);
  builderLines.push("ENV NODE_ENV=production");
  builderLines.push(`EXPOSE ${plan.containerPort}`);
  builderLines.push(`CMD ["sh", "-c", "${plan.startCommand}"]`);

  return `${builderLines.join("\n")}\n`;
}
