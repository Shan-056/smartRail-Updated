// ============================================================
// models/GpsLog.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Stores one GPS "ping" from a moving train — its current
// coordinates and speed at a moment in time. A stream of these
// pings is what lets the Dynamic ETA Engine figure out a
// train's real position and predict its arrival time, instead
// of trusting a fixed timetable.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface IGpsLog extends Document {
  train: Types.ObjectId;
  location: { lat: number; lng: number };
  speedKmph: number;
  distanceToNextStationM?: number;
  recordedAt: Date;
}

const gpsLogSchema = new Schema<IGpsLog>(
  {
    train: { type: Schema.Types.ObjectId, ref: "Train", required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // Current speed of the train in km/h at the moment of the ping
    speedKmph: { type: Number, min: 0, default: 0 },
    // Distance (in meters) remaining to the next station, if the
    // onboard GPS unit calculates it itself
    distanceToNextStationM: { type: Number, min: 0 },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

gpsLogSchema.index({ train: 1, recordedAt: -1 });

export const GpsLog: Model<IGpsLog> = models.GpsLog || model<IGpsLog>("GpsLog", gpsLogSchema);
