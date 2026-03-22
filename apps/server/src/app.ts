import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { analyticsRouter } from "./routes/analytics";
import { authRouter } from "./routes/auth";
import { deploymentsRouter, projectDeploymentsRouter } from "./routes/deployments";
import { githubRouter } from "./routes/github";
import { projectsRouter } from "./routes/projects";
import { webhooksRouter } from "./routes/webhooks";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use("/webhooks/github", express.raw({ type: "application/json" }), webhooksRouter);
  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", authRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/github", githubRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:id/deployments", projectDeploymentsRouter);
  app.use("/api/deployments", deploymentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
