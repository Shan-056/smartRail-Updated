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

const routeStopSchema = new Schema<IRouteStop>(
  {
    station: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    avgTravelTimeMin: { type: Number, required: true, default: 3 },
    sequence: { type: Number, required: true },
  },
  { _id: false }
);

const routeSchema = new Schema<IRoute>(
  {
    name: { type: String, required: true, trim: true },
    line: { type: String, enum: ["Western", "Central", "Harbour", "Trans-Harbour"], required: true },
    category: { type: String, enum: ["Fast", "Slow", "Semi-Fast"], default: "Slow" },
    stops: [routeStopSchema],
  },
  { timestamps: true }
);

export const Route: Model<IRoute> = models.Route || model<IRoute>("Route", routeSchema);
