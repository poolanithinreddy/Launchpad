import { z } from "zod";

const envVarSchema = z.object({
  key: z.string().trim().min(1, "Environment variable key is required."),
  value: z.string()
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required."),
  repoUrl: z.string().url("Repository URL must be a valid URL."),
  repoName: z.string().trim().min(1, "Repository name is required."),
  branch: z.string().trim().min(1).default("main"),
  framework: z.string().trim().min(1).default("other"),
  rootDir: z.string().trim().min(1).default("."),
  envVars: z.array(envVarSchema).optional().default([])
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    framework: z.string().trim().min(1).optional(),
    rootDir: z.string().trim().min(1).optional(),
    liveUrl: z.string().url().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided."
  });

export const createEnvVarSchema = envVarSchema;
