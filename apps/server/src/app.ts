import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { authRouter } from "./routes/auth";
import { deploymentsRouter, projectDeploymentsRouter } from "./routes/deployments";
import { githubRouter } from "./routes/github";
import { projectsRouter } from "./routes/projects";

export function createApp() {
  const app = express();

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
  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", authRouter);
  app.use("/api/github", githubRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:id/deployments", projectDeploymentsRouter);
  app.use("/api/deployments", deploymentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
