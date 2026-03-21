import { prisma } from "@launchpad/db";
import type { Router } from "express";
import { Router as createRouter } from "express";

import { env } from "../config/env";
import { authenticateRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/async-handler";
import {
  AUTH_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  getAuthCookieOptions,
  getClearedCookieOptions,
  getOAuthStateCookieOptions
} from "../lib/cookies";
import {
  createGitHubOAuthUrl,
  exchangeCodeForAccessToken,
  fetchGitHubProfile,
  generateOAuthState
} from "../lib/github";
import { ApiError } from "../lib/api-error";
import { signSessionToken } from "../lib/jwt";

function toSessionUser(user: {
  id: string;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString()
  };
}

export const authRouter: Router = createRouter();

authRouter.get("/github", (_req, res) => {
  const state = generateOAuthState();
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions());
  return res.redirect(createGitHubOAuthUrl(state));
});

authRouter.get(
  "/github/callback",
  asyncHandler(async (req, res) => {
    try {
      const code = req.query.code;
      const state = req.query.state;
      const storedState = req.cookies[OAUTH_STATE_COOKIE_NAME];

      if (typeof code !== "string" || typeof state !== "string") {
        throw new ApiError(400, "GITHUB_OAUTH_FAILED", "GitHub did not return a valid callback.");
      }

      if (!storedState || storedState !== state) {
        throw new ApiError(400, "OAUTH_STATE_MISMATCH", "OAuth state validation failed.");
      }

      const accessToken = await exchangeCodeForAccessToken(code);
      const profile = await fetchGitHubProfile(accessToken);

      const user = await prisma.user.upsert({
        where: {
          githubId: profile.githubId
        },
        update: {
          username: profile.username,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          accessToken
        },
        create: {
          githubId: profile.githubId,
          username: profile.username,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          accessToken
        }
      });

      const token = signSessionToken(user.id);

      res.clearCookie(OAUTH_STATE_COOKIE_NAME, getClearedCookieOptions());
      res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
      return res.redirect(`${env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "INTERNAL_SERVER_ERROR";
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, getClearedCookieOptions());
      return res.redirect(`${env.FRONTEND_URL}/login?error=${code}`);
    }
  })
);

authRouter.get(
  "/me",
  authenticateRequest,
  asyncHandler(async (req, res) => {
    return res.json({
      data: toSessionUser(req.user)
    });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, getClearedCookieOptions());
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, getClearedCookieOptions());
  return res.json({
    data: {
      success: true
    }
  });
});
