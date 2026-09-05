// ============================================================
// app/api/uts/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/uts. Same idea as the ATVM endpoint, but
// for tickets booked via the UTS mobile app or a manned counter
// instead of a machine.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { UtsLog } from "@/models/UtsLog";
import { recalculateCrowdForStation } from "@/services/analyticsEngine";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await requireAuth(req);
    requireRole(user, ["device", "admin"]);

    const { station, bookingChannel, ticketsIssued, destinationStation, fareAmount, transactionAt } =
      await req.json();

    if (!station) {
      return NextResponse.json({ message: "station is required." }, { status: 400 });
    }
    if (ticketsIssued !== undefined && (typeof ticketsIssued !== "number" || ticketsIssued < 1)) {
      return NextResponse.json({ message: "ticketsIssued must be a positive number." }, { status: 400 });
    }

    const log = await UtsLog.create({
      station,
      bookingChannel,
      ticketsIssued,
      destinationStation,
      fareAmount,
      transactionAt,
    });

    const crowdLog = await recalculateCrowdForStation(station);

    return NextResponse.json({ message: "UTS transaction recorded.", log, crowdLog }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to record UTS transaction.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
