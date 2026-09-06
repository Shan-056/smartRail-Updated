import { Schema, model, models, type Document, type Model } from "mongoose";

export interface IAlert extends Document {
  stationId: string;
  stationName?: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdBy: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

const alertSchema = new Schema<IAlert>(
  {
    stationId: { type: String, required: true, index: true },
    stationName: { type: String },
    message: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
  },
  { timestamps: true }
);

export const Alert: Model<IAlert> =
  models.Alert || model<IAlert>("Alert", alertSchema);
