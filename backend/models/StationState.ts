// ============================================================
// models/StationState.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Stores the CURRENT (not historical) live state of one station
// — its digital twin "snapshot". Unlike CrowdLog, which keeps a
// new row every time we recalculate (a full history), this
// collection keeps exactly ONE row per station that gets
// overwritten each update. It exists so services/digitalTwin.ts
// has something durable to read from right after a server
// restart, before any new data has come in yet.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface IStationState extends Document {
  station: Types.ObjectId;
  occupancy: number;
  inflow: number;
  outflow: number;
  lastUpdated: Date;
}

const stationStateSchema = new Schema<IStationState>({
  // One state document per station — enforced with `unique`
  station: { type: Schema.Types.ObjectId, ref: "Station", required: true, unique: true },
  // Current best-estimate headcount at the station
  occupancy: { type: Number, required: true, min: 0, default: 0 },
  // People estimated to have arrived since the previous update
  inflow: { type: Number, required: true, min: 0, default: 0 },
  // People estimated to have left since the previous update
  outflow: { type: Number, required: true, min: 0, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

export const StationState: Model<IStationState> =
  models.StationState || model<IStationState>("StationState", stationStateSchema);
