import { existsSync } from "fs";
import { access, readFile } from "fs/promises";
import path from "path";

import { ApiError } from "../../lib/api-error";

type PackageManager = "npm" | "pnpm" | "yarn" | "pip";
type SupportedFramework = "nextjs" | "react" | "node" | "python" | "static";

type PackageJson = {
  scripts?: Record<string, string | undefined>;
  dependencies?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
};

export type BuildPlan = {
  framework: SupportedFramework;
  packageManager: PackageManager;
  workingDirectory: string;
  installCommand: string | null;
  buildCommand: string | null;
  startCommand: string;
  runtimeType: "node" | "static" | "python";
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
    case "pip":
      return "if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi";
    case "npm":
    default:
      return "if [ -f package-lock.json ]; then npm ci; else npm install; fi";
  }
}

function runPackageScript(packageManager: Exclude<PackageManager, "pip">, script: string) {
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

function detectPythonStartCommand(projectRoot: string) {
  if (existsSync(path.join(projectRoot, "manage.py"))) {
    return "python manage.py runserver 0.0.0.0:3000";
  }

  if (existsSync(path.join(projectRoot, "main.py"))) {
    return "python -m uvicorn main:app --host 0.0.0.0 --port 3000 || python main.py";
  }

  if (existsSync(path.join(projectRoot, "app.py"))) {
    return "python -m uvicorn app:app --host 0.0.0.0 --port 3000 || python app.py";
  }

  throw new ApiError(
    400,
    "UNSUPPORTED_FRAMEWORK",
    "Python deployments require manage.py, main.py, or app.py in the configured root directory."
  );
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
  const hasPackageJson = existsSync(packageJsonPath);
  const preferredFramework = configuredFramework.toLowerCase();

  const hasStaticIndex = existsSync(path.join(resolvedRoot, "index.html"));
  const hasPythonManifest =
    existsSync(path.join(resolvedRoot, "requirements.txt")) ||
    existsSync(path.join(resolvedRoot, "pyproject.toml"));

  if ((hasStaticIndex && !hasPackageJson) || preferredFramework === "static") {
    return {
      framework: "static",
      packageManager: "npm",
      workingDirectory: normalizedRootDir,
      installCommand: null,
      buildCommand: null,
      startCommand: "serve -s /app/public -l 3000",
      runtimeType: "static",
      outputDirectory: ".",
      containerPort: 3000
    };
  }

  if (hasPythonManifest || preferredFramework === "python") {
    return {
      framework: "python",
      packageManager: "pip",
      workingDirectory: normalizedRootDir,
      installCommand: getInstallCommand("pip"),
      buildCommand: null,
      startCommand: detectPythonStartCommand(resolvedRoot),
      runtimeType: "python",
      outputDirectory: null,
      containerPort: 3000
    };
  }

  try {
    await access(packageJsonPath);
  } catch {
    throw new ApiError(
      400,
      "UNSUPPORTED_FRAMEWORK",
      "Launchpad could not find a supported app entrypoint in the configured root directory."
    );
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as PackageJson;
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  const scripts = packageJson.scripts ?? {};
  const packageManager = getPackageManager(resolvedRoot) as Exclude<PackageManager, "pip">;

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
    "Launchpad currently supports Next.js, React static builds, Node.js apps, raw static sites, and common Python entrypoints."
  );
}

export function createDockerfile(plan: BuildPlan) {
  const workingDirectory = plan.workingDirectory === "." ? "/workspace" : `/workspace/${plan.workingDirectory}`;

  if (plan.runtimeType === "python") {
    const lines = [
      "FROM python:3.11-alpine",
      "WORKDIR /workspace",
      "COPY . .",
      `WORKDIR ${workingDirectory}`,
      "ENV PYTHONDONTWRITEBYTECODE=1",
      "ENV PYTHONUNBUFFERED=1"
    ];

    if (plan.installCommand) {
      lines.push(`RUN ${plan.installCommand}`);
    }

    lines.push(`EXPOSE ${plan.containerPort}`);
    lines.push(`CMD ["sh", "-c", "${plan.startCommand}"]`);

    return `${lines.join("\n")}\n`;
  }

  const builderLines = ["FROM node:20-alpine AS builder", "WORKDIR /workspace", "COPY . ."];

  if (plan.installCommand) {
    builderLines.push(`WORKDIR ${workingDirectory}`, `RUN ${plan.installCommand}`);
  }

  if (plan.buildCommand) {
    builderLines.push(`RUN ${plan.buildCommand}`);
  }

  if (plan.runtimeType === "static") {
    const outputDirectory =
      plan.outputDirectory === "." ? workingDirectory : `${workingDirectory}/${plan.outputDirectory}`;

    builderLines.push("", "FROM node:20-alpine AS runner", "WORKDIR /app", "RUN npm install -g serve");
    builderLines.push(`COPY --from=builder ${outputDirectory} ./public`);
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
