import { model, models, Schema, type InferSchemaType } from "mongoose";

import { BUILD_LOG_LEVELS } from "@launchpad/types";

const buildLogLineSchema = new Schema(
  {
    timestamp: {
      type: Date,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: BUILD_LOG_LEVELS,
      required: true
    }
  },
  {
    _id: false
  }
);

const buildLogSchema = new Schema({
  deploymentId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  lines: {
    type: [buildLogLineSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export type BuildLogDocument = InferSchemaType<typeof buildLogSchema>;

export const BuildLogModel =
  models.BuildLog ?? model<BuildLogDocument>("BuildLog", buildLogSchema);
