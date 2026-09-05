// ============================================================
// models/Route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// A "route" is a defined path a train follows — an ordered
// list of stations with the usual travel time between each
// stop. This is the "template" the ETA engine uses to know
// what stations come next, before real-time GPS data adjusts it.
// This is also where GTFS-imported schedule data would live,
// since GTFS is essentially route/stop/timing data.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";
import type { Line } from "./Station";

interface IRouteStop {
  station: Types.ObjectId;
  avgTravelTimeMin: number;
  sequence: number;
}

export interface IRoute extends Document {
  name: string;
  line: Line;
  category: "Fast" | "Slow" | "Semi-Fast";
  stops: IRouteStop[];
}

// One stop within a route: which station, and how many minutes
// it usually takes to reach it from the previous stop.
const routeStopSchema = new Schema<IRouteStop>(
  {
    station: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    avgTravelTimeMin: { type: Number, required: true, default: 3 },
    // The order this stop appears in, e.g. 1st stop, 2nd stop...
    sequence: { type: Number, required: true },
  },
  { _id: false }
);

const routeSchema = new Schema<IRoute>(
  {
    name: { type: String, required: true, trim: true },
    line: { type: String, enum: ["Western", "Central", "Harbour", "Trans-Harbour"], required: true },
    // Whether this route stops at every station or skips some
    category: { type: String, enum: ["Fast", "Slow", "Semi-Fast"], default: "Slow" },
    stops: [routeStopSchema],
  },
  { timestamps: true }
);

export const Route: Model<IRoute> = models.Route || model<IRoute>("Route", routeSchema);
