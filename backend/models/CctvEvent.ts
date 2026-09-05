// ============================================================
// models/CctvEvent.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Stores one "observation" sent by the vision system after
// analyzing a CCTV camera feed at a station — mainly, how many
// people it counted in that camera's view at that moment. This
// is one of the raw data sources feeding crowd-density
// calculations.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface ICctvEvent extends Document {
  station: Types.ObjectId;
  cameraId: string;
  zone: string;
  peopleCount: number;
  confidence: number;
  capturedAt: Date;
}

const cctvEventSchema = new Schema<ICctvEvent>(
  {
    station: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    // Identifier for the specific camera, e.g. "CAM-PLATFORM-1"
    cameraId: { type: String, required: true },
    // Area the camera watches, e.g. "platform", "concourse", "entry-gate"
    zone: { type: String, default: "platform" },
    peopleCount: { type: Number, required: true, min: 0 },
    // The vision model's confidence in this count (0 to 1)
    confidence: { type: Number, min: 0, max: 1, default: 0.9 },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Speeds up "give me the latest readings for this station" queries
cctvEventSchema.index({ station: 1, capturedAt: -1 });

export const CctvEvent: Model<ICctvEvent> =
  models.CctvEvent || model<ICctvEvent>("CctvEvent", cctvEventSchema);
