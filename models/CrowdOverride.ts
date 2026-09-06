import { Schema, model, models, type Document, type Model } from "mongoose";

export interface ICrowdOverride extends Document {
  stationId: string;
  stationName?: string;
  level: "low" | "medium" | "high" | "critical";
  densityPercent: number;
  reason?: string;
  setBy: string;
  setAt: Date;
  active: boolean;
}

const crowdOverrideSchema = new Schema<ICrowdOverride>(
  {
    stationId: { type: String, required: true, unique: true, index: true },
    stationName: { type: String },
    level: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    densityPercent: { type: Number, required: true, min: 0, max: 100 },
    reason: { type: String, trim: true },
    setBy: { type: String, required: true },
    setAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CrowdOverride: Model<ICrowdOverride> =
  models.CrowdOverride || model<ICrowdOverride>("CrowdOverride", crowdOverrideSchema);
