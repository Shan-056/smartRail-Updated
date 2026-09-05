// ============================================================
// app/api/atvm/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/atvm. Called by an Automatic Ticket Vending
// Machine every time it sells a ticket. We validate and log the
// sale, then refresh the crowd estimate for that station, since
// a burst of ticket sales usually means a burst of new
// passengers arriving.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { AtvmLog } from "@/models/AtvmLog";
import { recalculateCrowdForStation } from "@/services/analyticsEngine";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await requireAuth(req);
    requireRole(user, ["device", "admin"]);

    const { station, machineId, ticketsIssued, destinationStation, fareAmount, transactionAt } =
      await req.json();

    if (!station || !machineId) {
      return NextResponse.json({ message: "station and machineId are required." }, { status: 400 });
    }
    if (ticketsIssued !== undefined && (typeof ticketsIssued !== "number" || ticketsIssued < 1)) {
      return NextResponse.json({ message: "ticketsIssued must be a positive number." }, { status: 400 });
    }

    const log = await AtvmLog.create({
      station,
      machineId,
      ticketsIssued,
      destinationStation,
      fareAmount,
      transactionAt,
    });

    const crowdLog = await recalculateCrowdForStation(station);

    return NextResponse.json({ message: "ATVM transaction recorded.", log, crowdLog }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to record ATVM transaction.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
