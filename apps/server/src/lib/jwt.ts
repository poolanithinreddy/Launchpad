import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { ApiError } from "./api-error";

type SessionPayload = {
  sub: string;
};

export function signSessionToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export function verifySessionToken(token: string) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as SessionPayload;
    return payload.sub;
  } catch {
    throw new ApiError(401, "INVALID_SESSION", "Your session is invalid or expired.");
  }
}
