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
    speedKmph: { type: Number, min: 0, default: 0 },
    distanceToNextStationM: { type: Number, min: 0 },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

gpsLogSchema.index({ train: 1, recordedAt: -1 });

export const GpsLog: Model<IGpsLog> = models.GpsLog || model<IGpsLog>("GpsLog", gpsLogSchema);
