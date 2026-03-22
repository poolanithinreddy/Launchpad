import type { BuildLogLevel, BuildLogLineDto } from "@launchpad/types";

import { connectToMongo, isMongoAvailable } from "../../lib/mongoose";
import { BuildLogModel } from "../../models/BuildLog";
import { publishDeploymentEvent } from "./events";

const ansiPattern =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function normalizeLogText(text: string) {
  return text.replace(ansiPattern, "").replace(/\u0000/g, "").trimEnd();
}

export function detectLogLevel(text: string): BuildLogLevel {
  if (/\berror\b|\berr\b/i.test(text)) {
    return "error";
  }

  if (/\bwarn\b/i.test(text)) {
    return "warn";
  }

  if (/\bsuccess\b|\bdone\b|\bcompiled\b/i.test(text)) {
    return "success";
  }

  return "info";
}

async function persistLogLine(deploymentId: string, line: BuildLogLineDto) {
  const connected = isMongoAvailable() || (await connectToMongo());

  if (!connected) {
    return;
  }

  try {
    await BuildLogModel.findOneAndUpdate(
      {
        deploymentId
      },
      {
        $setOnInsert: {
          createdAt: new Date()
        },
        $push: {
          lines: {
            timestamp: new Date(line.timestamp),
            text: line.text,
            level: line.level
          }
        }
      },
      {
        upsert: true
      }
    ).exec();
  } catch (error) {
    console.warn(`Failed to persist logs for deployment ${deploymentId}.`, error);
  }
}

export async function appendDeploymentLogLine({
  deploymentId,
  text,
  level = detectLogLevel(text)
}: {
  deploymentId: string;
  text: string;
  level?: BuildLogLevel;
}) {
  const normalizedText = normalizeLogText(text);

  if (!normalizedText) {
    return null;
  }

  const line: BuildLogLineDto = {
    timestamp: new Date().toISOString(),
    text: normalizedText,
    level
  };

  await Promise.allSettled([
    persistLogLine(deploymentId, line),
    publishDeploymentEvent({
      type: "log-line",
      deploymentId,
      line
    })
  ]);

  return line;
}

export async function getDeploymentLogs(deploymentId: string) {
  const connected = isMongoAvailable() || (await connectToMongo());

  if (!connected) {
    return [] as BuildLogLineDto[];
  }

  try {
    const buildLog = await BuildLogModel.findOne({
      deploymentId
    }).exec();

    return (
      buildLog?.lines.map((line: { timestamp: Date; text: string; level: BuildLogLevel }) => ({
        timestamp: new Date(line.timestamp).toISOString(),
        text: line.text,
        level: line.level
      })) ?? []
    );
  } catch (error) {
    console.warn(`Failed to load logs for deployment ${deploymentId}.`, error);
    return [] as BuildLogLineDto[];
  }
}

export async function getLastDeploymentLogLines(deploymentId: string, count: number) {
  const logs = await getDeploymentLogs(deploymentId);
  return logs.slice(-count);
}
