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
    const page = Number(req.query.page ?? 1);
    const perPage = Number(req.query.perPage ?? 30);
    const repos = await fetchGitHubRepos(req.user.accessToken, {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      perPage: Number.isFinite(perPage) && perPage > 0 ? Math.min(perPage, 100) : 30
    });

    return res.json({
      data: repos
    });
  })
);
