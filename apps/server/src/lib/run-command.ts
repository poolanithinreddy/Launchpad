import { spawn } from "child_process";

type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  ignoreExitCode?: boolean;
  onStdoutLine?: (line: string) => void | Promise<void>;
  onStderrLine?: (line: string) => void | Promise<void>;
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
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let lineHandlers = Promise.resolve();

    const emitLine = (handler: RunCommandOptions["onStdoutLine"], line: string) => {
      if (!handler) {
        return;
      }

      lineHandlers = lineHandlers
        .then(() => handler(line))
        .catch((error) => {
          console.error("Failed to process command output line.", error);
        });
    };

    const flushBufferedLines = (
      buffer: string,
      handler: RunCommandOptions["onStdoutLine"]
    ) => {
      const normalizedBuffer = buffer.replace(/\r/g, "\n");
      const segments = normalizedBuffer.split("\n");
      const remaining = segments.pop() ?? "";

      for (const segment of segments) {
        emitLine(handler, segment);
      }

      return remaining;
    };

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      stdoutBuffer += text;
      stdoutBuffer = flushBufferedLines(stdoutBuffer, options.onStdoutLine);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      stderrBuffer += text;
      stderrBuffer = flushBufferedLines(stderrBuffer, options.onStderrLine);
    });

    child.on("error", reject);

    child.on("close", async (code) => {
      if (stdoutBuffer) {
        emitLine(options.onStdoutLine, stdoutBuffer.replace(/\r/g, ""));
      }

      if (stderrBuffer) {
        emitLine(options.onStderrLine, stderrBuffer.replace(/\r/g, ""));
      }

      await lineHandlers;

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
