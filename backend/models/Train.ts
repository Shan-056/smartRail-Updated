// ============================================================
// models/Train.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Represents one physical train run "in service" right now (or
// scheduled to run). It links to the Route it's following and
// tracks its live status — which station it's at/approaching,
// and how full it currently is.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";
import type { Line } from "./Station";

export interface ITrain extends Document {
  trainNumber: string;
  line: Line;
  route: Types.ObjectId;
  direction: "Up" | "Down";
  currentStation?: Types.ObjectId;
  nextStation?: Types.ObjectId;
  status: "scheduled" | "running" | "delayed" | "terminated" | "cancelled";
  occupancyPercent: number;
}

const trainSchema = new Schema<ITrain>(
  {
    // The train's public identifier, e.g. "WR-1234"
    trainNumber: { type: String, required: true, unique: true, trim: true },
    line: { type: String, enum: ["Western", "Central", "Harbour", "Trans-Harbour"], required: true },
    route: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    // Mumbai suburban convention: Up = towards city, Down = away
    direction: { type: String, enum: ["Up", "Down"], required: true },
    currentStation: { type: Schema.Types.ObjectId, ref: "Station" },
    nextStation: { type: Schema.Types.ObjectId, ref: "Station" },
    status: {
      type: String,
      enum: ["scheduled", "running", "delayed", "terminated", "cancelled"],
      default: "scheduled",
    },
    // 0-100% estimate of how full the train currently is, usually
    // derived from CCTV/crowd analysis feeding into crowd_logs
    occupancyPercent: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

export const Train: Model<ITrain> = models.Train || model<ITrain>("Train", trainSchema);
