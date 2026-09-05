// ============================================================
// models/CrowdLog.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is a "computed" record — a snapshot summarizing how
// crowded a station is at a given moment, after combining
// CCTV counts + ticket sales (and, once available, the AI
// engine's own prediction). Instead of the frontend re-crunching
// raw camera/ticket data, it just reads these ready-made
// summaries. This is what powers the live crowd-density map.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface ICrowdLog extends Document {
  station: Types.ObjectId;
  estimatedCount: number;
  densityPercent: number;
  level: "low" | "moderate" | "high" | "critical";
  sourceBreakdown: { cctvCount: number; ticketCount: number };
  // True once a real AI-engine prediction has been folded in, as
  // opposed to the plain-math fallback calculation
  aiAssisted: boolean;
  calculatedAt: Date;
}

const crowdLogSchema = new Schema<ICrowdLog>(
  {
    station: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    // Best-estimate headcount at the station right now
    estimatedCount: { type: Number, required: true, min: 0 },
    // estimatedCount as a % of the station's rated capacity — lets
    // the frontend color-code (green/amber/red)
    densityPercent: { type: Number, min: 0, max: 200, required: true },
    // Simple traffic-light label derived from densityPercent
    level: { type: String, enum: ["low", "moderate", "high", "critical"], required: true },
    // Which raw sources contributed to this estimate — useful for debugging
    sourceBreakdown: {
      cctvCount: { type: Number, default: 0 },
      ticketCount: { type: Number, default: 0 },
    },
    aiAssisted: { type: Boolean, default: false },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Fast lookup of "latest crowd reading for this station"
crowdLogSchema.index({ station: 1, calculatedAt: -1 });

export const CrowdLog: Model<ICrowdLog> = models.CrowdLog || model<ICrowdLog>("CrowdLog", crowdLogSchema);
