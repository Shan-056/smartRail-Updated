// ============================================================
// models/UtsLog.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// UTS = Unreserved Ticketing System (the mobile app / counter
// system many Mumbai commuters use instead of a physical ATVM
// machine). Every ticket booked through UTS gets logged here.
// Combined with ATVM logs, this gives total real-time
// footfall of ticket-buyers heading into a station.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface IUtsLog extends Document {
  station: Types.ObjectId;
  bookingChannel: "mobile-app" | "counter";
  ticketsIssued: number;
  destinationStation?: Types.ObjectId;
  fareAmount?: number;
  transactionAt: Date;
}

const utsLogSchema = new Schema<IUtsLog>(
  {
    station: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    // How the ticket was booked: phone app or a manned counter
    bookingChannel: { type: String, enum: ["mobile-app", "counter"], default: "mobile-app" },
    ticketsIssued: { type: Number, required: true, min: 1, default: 1 },
    destinationStation: { type: Schema.Types.ObjectId, ref: "Station" },
    fareAmount: { type: Number, min: 0 },
    transactionAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

utsLogSchema.index({ station: 1, transactionAt: -1 });

export const UtsLog: Model<IUtsLog> = models.UtsLog || model<IUtsLog>("UtsLog", utsLogSchema);
