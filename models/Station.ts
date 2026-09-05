// ============================================================
// models/Station.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Describes what one "station" record looks like — its name,
// code, which railway line/corridor it's on, its map
// coordinates, and how many platforms it has. Every other
// collection (trains, crowd logs, etc.) refers back to a
// station using its ObjectId.
//
// Two fields matter for the frontend's "click a station" flow:
//   - corridor: which branch of the network the station sits on
//     (the Central line splits after Kalyan into a Kasara branch
//     and a Karjat branch — this field is how the UI groups
//     "CSMT side / Thane-Kalyan / Kasara side / Karjat side").
//   - aiStationId: the station code the separately-trained AI
//     engine actually recognizes (it was trained only on the
//     Western line: CCG..VR). Stations outside that set simply
//     leave this blank — predict routes automatically fall back
//     to the built-in math engine for them (see
//     services/analyticsEngine.ts), so the app stays fully
//     functional everywhere even though "real ML" only covers
//     the Western line for now.
// ============================================================

import { Schema, model, models, type Document, type Model } from "mongoose";

export type Line = "Western" | "Central" | "Harbour" | "Trans-Harbour";

// Which branch/direction a station belongs to, used to group the
// station-click UI (e.g. Central line riders picking a direction).
export type Corridor =
  | "Churchgate-Virar" // Western line, single trunk
  | "CSMT-Thane" // Central line trunk, CSMT to Thane
  | "Thane-Kalyan" // Central line trunk, Thane to Kalyan
  | "Kalyan-Kasara" // Central line, Kasara branch (past Kalyan)
  | "Kalyan-Karjat" // Central line, Karjat branch (past Kalyan)
  | "CSMT-Panvel" // Harbour line, CSMT to Panvel
  | "Wadala-Goregaon" // Harbour line, Wadala to Goregaon branch
  | "Thane-Panvel"; // Trans-Harbour line, Thane to Panvel

export interface IStation extends Document {
  code: string;
  name: string;
  line: Line;
  corridor: Corridor;
  aiStationId?: string;
  location: { lat: number; lng: number };
  platformCount: number;
  capacity: number;
  sequence: number;
}

const stationSchema = new Schema<IStation>(
  {
    // Short unique code for the station, e.g. "DR" for Dadar
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // Full readable name, e.g. "Dadar"
    name: { type: String, required: true, trim: true },
    line: { type: String, enum: ["Western", "Central", "Harbour", "Trans-Harbour"], required: true },
    corridor: {
      type: String,
      enum: ["Churchgate-Virar", "CSMT-Thane", "Thane-Kalyan", "Kalyan-Kasara", "Kalyan-Karjat"],
      required: true,
    },
    // Matches an ID in the AI engine's config.STATION_IDS when a
    // trained model exists for this station; left undefined otherwise.
    aiStationId: { type: String, trim: true, uppercase: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    platformCount: { type: Number, default: 2 },
    // Maximum comfortable headcount before the station is "overcrowded"
    capacity: { type: Number, default: 5000 },
    // Order along its corridor, used to draw the route line on the map
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Station: Model<IStation> = models.Station || model<IStation>("Station", stationSchema);
