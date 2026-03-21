import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_REDIRECT_URI: z.string().url(),
  PREVIEW_HOST: z.string().min(1).default("localhost"),
  PREVIEW_PROTOCOL: z.enum(["http", "https"]).default("http"),
  PREVIEW_PORT_RANGE_START: z.coerce.number().int().positive().default(3100),
  PREVIEW_PORT_RANGE_END: z.coerce.number().int().positive().default(3199)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid server environment variables: ${issues}`);
}

export const env = parsed.data;
