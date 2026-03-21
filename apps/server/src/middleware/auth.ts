import type { NextFunction, Request, Response } from "express";

import { prisma } from "@launchpad/db";

import { AUTH_COOKIE_NAME, getClearedCookieOptions } from "../lib/cookies";
import { ApiError } from "../lib/api-error";
import { verifySessionToken } from "../lib/jwt";

export async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[AUTH_COOKIE_NAME];

  if (!token) {
    return next(new ApiError(401, "AUTH_REQUIRED", "Authentication is required."));
  }

  try {
    const userId = verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, getClearedCookieOptions());
      return next(new ApiError(401, "INVALID_SESSION", "Your session is invalid or expired."));
    }

    req.user = user;
    return next();
  } catch (error) {
    res.clearCookie(AUTH_COOKIE_NAME, getClearedCookieOptions());
    return next(error);
  }
}
