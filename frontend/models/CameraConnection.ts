import { Schema, model, models, type Document, type Model } from "mongoose";

export interface ICameraConnection extends Document {
  stationId: string;
  stationName?: string;
  label: string;
  status: "disconnected" | "connected";
  addedBy: string;
  addedAt: Date;
}

const cameraConnectionSchema = new Schema<ICameraConnection>(
  {
    stationId: { type: String, required: true, index: true },
    stationName: { type: String },
    label: { type: String, required: true, trim: true },
    status: { type: String, enum: ["disconnected", "connected"], default: "disconnected" },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CameraConnection: Model<ICameraConnection> =
  models.CameraConnection || model<ICameraConnection>("CameraConnection", cameraConnectionSchema);
