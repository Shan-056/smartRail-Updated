// ============================================================
// models/EtaLog.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Stores one computed ETA (Estimated Time of Arrival) — how
// many minutes we predict a specific train will take to reach
// a specific upcoming station. This is what the frontend reads
// to show "Train WR-1234 arriving at Dadar in 3 min".
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface IEtaLog extends Document {
  train: Types.ObjectId;
  targetStation: Types.ObjectId;
  etaMinutes: number;
  predictedArrival: Date;
  confidence: number;
  // True once a real AI-engine prediction has been folded in, as
  // opposed to the plain-math fallback calculation
  aiAssisted: boolean;
  calculatedAt: Date;
}

const etaLogSchema = new Schema<IEtaLog>(
  {
    train: { type: Schema.Types.ObjectId, ref: "Train", required: true },
    // The station this ETA prediction is FOR
    targetStation: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    // Predicted number of minutes until arrival, from calculation time
    etaMinutes: { type: Number, required: true, min: 0 },
    // The exact predicted clock time of arrival, for convenience
    predictedArrival: { type: Date, required: true },
    // Confidence (0 to 1) — falls when GPS data is old/sparse
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
    aiAssisted: { type: Boolean, default: false },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

etaLogSchema.index({ train: 1, targetStation: 1, calculatedAt: -1 });

export const EtaLog: Model<IEtaLog> = models.EtaLog || model<IEtaLog>("EtaLog", etaLogSchema);
