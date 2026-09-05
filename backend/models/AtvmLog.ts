// ============================================================
// models/AtvmLog.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// ATVM = Automatic Ticket Vending Machine. Every ticket sold
// from one of these machines gets logged here. Ticket-sale
// bursts at a station are a fast signal that new passengers
// are about to arrive.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface IAtvmLog extends Document {
  station: Types.ObjectId;
  machineId: string;
  ticketsIssued: number;
  destinationStation?: Types.ObjectId;
  fareAmount?: number;
  transactionAt: Date;
}

const atvmLogSchema = new Schema<IAtvmLog>(
  {
    station: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    // Which specific machine at the station, e.g. "ATVM-03"
    machineId: { type: String, required: true },
    ticketsIssued: { type: Number, required: true, min: 1, default: 1 },
    // The destination printed on the ticket, if known
    destinationStation: { type: Schema.Types.ObjectId, ref: "Station" },
    fareAmount: { type: Number, min: 0 },
    transactionAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

atvmLogSchema.index({ station: 1, transactionAt: -1 });

export const AtvmLog: Model<IAtvmLog> = models.AtvmLog || model<IAtvmLog>("AtvmLog", atvmLogSchema);
