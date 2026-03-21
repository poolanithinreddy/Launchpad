import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ApiError } from "../lib/api-error";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Request validation failed.";
    return res.status(400).json({
      error: message,
      code: "VALIDATION_ERROR"
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code
    });
  }

  console.error(error);

  return res.status(500).json({
    error: "Something went wrong.",
    code: "INTERNAL_SERVER_ERROR"
  });
}
