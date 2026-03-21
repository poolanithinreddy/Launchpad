import { spawn } from "child_process";

type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  ignoreExitCode?: boolean;
};

type RunCommandResult = {
  stdout: string;
  stderr: string;
};

export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {}
): Promise<RunCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0 || options.ignoreExitCode) {
        resolve({
          stdout,
          stderr
        });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });
  });
}
