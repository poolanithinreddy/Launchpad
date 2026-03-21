import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __launchpad_prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__launchpad_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__launchpad_prisma__ = prisma;
}
