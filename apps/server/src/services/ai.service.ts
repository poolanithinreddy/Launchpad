import type { BuildLogLineDto } from "@launchpad/types";

import { env } from "../config/env";
import { getLastDeploymentLogLines } from "./deployments/logs";

const systemPrompt = `You are a senior DevOps engineer. A deployment failed. Analyze the build log and respond with ONLY a JSON object:
{
  "summary": "1 sentence: what went wrong",
  "cause": "1-2 sentences: root cause",
  "fix": "2-3 sentences: exact steps to fix it",
  "severity": "low | medium | high"
}
No markdown, no preamble, just the JSON.`;

function normalizeAiResponse(content: string) {
  const trimmed = content.trim();

  try {
    const parsed = JSON.parse(trimmed) as {
      summary?: string;
      cause?: string;
      fix?: string;
      severity?: string;
    };

    if (
      typeof parsed.summary === "string" &&
      typeof parsed.cause === "string" &&
      typeof parsed.fix === "string" &&
      typeof parsed.severity === "string"
    ) {
      return JSON.stringify({
        summary: parsed.summary,
        cause: parsed.cause,
        fix: parsed.fix,
        severity: ["low", "medium", "high"].includes(parsed.severity.toLowerCase())
          ? parsed.severity.toLowerCase()
          : "medium"
      });
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

async function requestOpenAiAnalysis({
  messages
}: {
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
}) {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_completion_tokens: 500,
      response_format: {
        type: "json_object"
      },
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI analysis request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  return data.choices?.[0]?.message?.content ?? null;
}

async function requestAzureOpenAiAnalysis({
  messages
}: {
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
}) {
  if (!env.AZURE_OPENAI_KEY || !env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_DEPLOYMENT) {
    return null;
  }

  const endpoint = `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-01`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "api-key": env.AZURE_OPENAI_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      temperature: 0.2,
      max_tokens: 500,
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Azure OpenAI analysis request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  return data.choices?.[0]?.message?.content ?? null;
}

export async function analyzeFailure(deploymentId: string, projectName: string): Promise<string | null> {
  const logLines: BuildLogLineDto[] = await getLastDeploymentLogLines(deploymentId, 50);

  if (!logLines.length) {
    return null;
  }

  const userPrompt = `Project: ${projectName}\n\nBuild log:\n${logLines
    .map((line) => `[${line.timestamp}] ${line.text}`)
    .join("\n")}`;

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt
    },
    {
      role: "user" as const,
      content: userPrompt
    }
  ];

  try {
    const content =
      (await requestAzureOpenAiAnalysis({
        messages
      })) ??
      (await requestOpenAiAnalysis({
        messages
      }));

    if (!content) {
      return null;
    }

    return normalizeAiResponse(content);
  } catch (error) {
    console.warn(`AI failure analysis skipped for deployment ${deploymentId}.`, error);
    return null;
  }
}
