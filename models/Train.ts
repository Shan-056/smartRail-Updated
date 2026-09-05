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
    trainNumber: { type: String, required: true, unique: true, trim: true },
    line: { type: String, enum: ["Western", "Central", "Harbour", "Trans-Harbour"], required: true },
    route: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    direction: { type: String, enum: ["Up", "Down"], required: true },
    currentStation: { type: Schema.Types.ObjectId, ref: "Station" },
    nextStation: { type: Schema.Types.ObjectId, ref: "Station" },
    status: {
      type: String,
      enum: ["scheduled", "running", "delayed", "terminated", "cancelled"],
      default: "scheduled",
    },
    occupancyPercent: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

export const Train: Model<ITrain> = models.Train || model<ITrain>("Train", trainSchema);
