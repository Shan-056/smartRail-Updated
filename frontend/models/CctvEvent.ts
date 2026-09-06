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
    cameraId: { type: String, required: true },
    zone: { type: String, default: "platform" },
    peopleCount: { type: Number, required: true, min: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0.9 },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

cctvEventSchema.index({ station: 1, capturedAt: -1 });

export const CctvEvent: Model<ICctvEvent> =
  models.CctvEvent || model<ICctvEvent>("CctvEvent", cctvEventSchema);
