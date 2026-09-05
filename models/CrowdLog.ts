import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface ICrowdLog extends Document {
  station: Types.ObjectId;
  estimatedCount: number;
  densityPercent: number;
  level: "low" | "moderate" | "high" | "critical";
  sourceBreakdown: { cctvCount: number; ticketCount: number };
  aiAssisted: boolean;
  calculatedAt: Date;
}

const crowdLogSchema = new Schema<ICrowdLog>(
  {
    station: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    estimatedCount: { type: Number, required: true, min: 0 },
    densityPercent: { type: Number, min: 0, max: 200, required: true },
    level: { type: String, enum: ["low", "moderate", "high", "critical"], required: true },
    sourceBreakdown: {
      cctvCount: { type: Number, default: 0 },
      ticketCount: { type: Number, default: 0 },
    },
    aiAssisted: { type: Boolean, default: false },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

crowdLogSchema.index({ station: 1, calculatedAt: -1 });

export const CrowdLog: Model<ICrowdLog> = models.CrowdLog || model<ICrowdLog>("CrowdLog", crowdLogSchema);
