// ============================================================
// models/Station.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Describes what one "station" record looks like — its name,
// code, which railway line it's on, its map coordinates, and
// how many platforms it has. Every other collection (trains,
// crowd logs, etc.) refers back to a station using its ObjectId.
// ============================================================

import { Schema, model, models, type Document, type Model } from "mongoose";

export type Line = "Western" | "Central" | "Harbour" | "Trans-Harbour";

export interface IStation extends Document {
  code: string;
  name: string;
  line: Line;
  location: { lat: number; lng: number };
  platformCount: number;
  capacity: number;
}

const stationSchema = new Schema<IStation>(
  {
    // Short unique code for the station, e.g. "DR" for Dadar
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // Full readable name, e.g. "Dadar"
    name: { type: String, required: true, trim: true },
    line: { type: String, enum: ["Western", "Central", "Harbour", "Trans-Harbour"], required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    platformCount: { type: Number, default: 2 },
    // Maximum comfortable headcount before the station is "overcrowded"
    capacity: { type: Number, default: 5000 },
  },
  { timestamps: true }
);

export const Station: Model<IStation> = models.Station || model<IStation>("Station", stationSchema);
