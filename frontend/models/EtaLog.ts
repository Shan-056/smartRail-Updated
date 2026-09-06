import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface IEtaLog extends Document {
  train: Types.ObjectId;
  targetStation: Types.ObjectId;
  etaMinutes: number;
  predictedArrival: Date;
  confidence: number;
  aiAssisted: boolean;
  calculatedAt: Date;
}

const etaLogSchema = new Schema<IEtaLog>(
  {
    train: { type: Schema.Types.ObjectId, ref: "Train", required: true },
    targetStation: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    etaMinutes: { type: Number, required: true, min: 0 },
    predictedArrival: { type: Date, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
    aiAssisted: { type: Boolean, default: false },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

etaLogSchema.index({ train: 1, targetStation: 1, calculatedAt: -1 });

export const EtaLog: Model<IEtaLog> = models.EtaLog || model<IEtaLog>("EtaLog", etaLogSchema);
