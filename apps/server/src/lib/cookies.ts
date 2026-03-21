import type { CookieOptions } from "express";

import { env } from "../config/env";

export const AUTH_COOKIE_NAME = "launchpad_token";
export const OAUTH_STATE_COOKIE_NAME = "launchpad_oauth_state";

const isProduction = env.NODE_ENV === "production";

function parseDurationToMs(value: string) {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) {
    throw new Error(`Unsupported JWT_EXPIRES_IN value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported JWT_EXPIRES_IN value: ${value}`);
  }
}

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: parseDurationToMs(env.JWT_EXPIRES_IN)
  };
}

export function getClearedCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
  };
}

export function getOAuthStateCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60 * 1000
  };
}
