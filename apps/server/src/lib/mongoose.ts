import mongoose from "mongoose";

import { env } from "../config/env";

let connectionAttempt: Promise<boolean> | null = null;
let listenersRegistered = false;
let hasWarned = false;

function registerListeners() {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on("connected", () => {
    hasWarned = false;
    console.log("Launchpad MongoDB connection established.");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("Launchpad MongoDB connection lost. Log persistence is temporarily disabled.");
  });

  mongoose.connection.on("error", (error) => {
    if (!hasWarned) {
      console.warn(
        "Launchpad could not connect to MongoDB. Continuing without log persistence.",
        error
      );
      hasWarned = true;
    }
  });
}

export function isMongoAvailable() {
  return mongoose.connection.readyState === 1;
}

export async function connectToMongo() {
  registerListeners();

  if (isMongoAvailable()) {
    return true;
  }

  if (!connectionAttempt) {
    connectionAttempt = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 3_000
      })
      .then(() => true)
      .catch((error) => {
        if (!hasWarned) {
          console.warn(
            "Launchpad could not connect to MongoDB. Continuing without log persistence.",
            error
          );
          hasWarned = true;
        }

        return false;
      })
      .finally(() => {
        connectionAttempt = null;
      });
  }

  return connectionAttempt;
}
