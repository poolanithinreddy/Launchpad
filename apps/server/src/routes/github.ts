import type { Router } from "express";
import { Router as createRouter } from "express";

import { asyncHandler } from "../lib/async-handler";
import { fetchGitHubRepos } from "../lib/github";
import { authenticateRequest } from "../middleware/auth";

export const githubRouter: Router = createRouter();

githubRouter.use(authenticateRequest);

githubRouter.get(
  "/repos",
  asyncHandler(async (req, res) => {
    const repos = await fetchGitHubRepos(req.user.accessToken);

    return res.json({
      data: repos
    });
  })
);
