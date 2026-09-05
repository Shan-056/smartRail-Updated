// ============================================================
// websocket/socketServer.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the "live broadcast" part of the backend. Instead of
// making the frontend keep asking "any updates yet?" over and
// over (polling), we open a WebSocket connection (via Socket.IO)
// and push fresh crowd + ETA data to every connected client
// automatically, every few seconds — like a radio station:
// clients "tune in" once, and we keep streaming updates to them.
//
// IMPORTANT NOTE ON NEXT.JS + WEBSOCKETS:
// Next.js API routes (the app/api/ files) are designed to handle
// one request and finish — they are NOT built to keep a
// long-lived WebSocket connection open. So this file is wired up
// through a small custom server (server.ts in the project root)
// instead of a normal app/api/ route. This is the standard,
// documented way to add Socket.IO to a Next.js app.
// ============================================================

import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { connectToDatabase } from "@/lib/mongodb";
import { CrowdLog } from "@/models/CrowdLog";
import { EtaLog } from "@/models/EtaLog";
import { Station } from "@/models/Station";

/**
 * gatherLatestSnapshot
 * Human explanation: Builds one combined "current state of the
 * network" object — the newest crowd reading for every station,
 * plus the newest ETA prediction for every train — ready to send
 * to all connected clients in a single message.
 */
async function gatherLatestSnapshot() {
  const crowd = await CrowdLog.aggregate([
    { $sort: { calculatedAt: -1 } },
    { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
  ]);
  await Station.populate(crowd, { path: "station", select: "name code line" });

  const eta = await EtaLog.aggregate([
    { $sort: { calculatedAt: -1 } },
    { $group: { _id: { train: "$train", station: "$targetStation" }, doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
  ]);

  return { crowd, eta, generatedAt: new Date() };
}

/**
 * initRealtimeServer
 * Human explanation: Sets up Socket.IO on top of our existing
 * HTTP server, and starts a repeating timer that, every few
 * seconds, fetches the latest crowd/ETA snapshot and broadcasts
 * it to every connected client under the "network:update" event
 * name. The frontend team just needs to listen for that event.
 */
export function initRealtimeServer(httpServer: HTTPServer) {
  const io = new IOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  const intervalMs = Number(process.env.BROADCAST_INTERVAL_MS) || 5000;

  setInterval(async () => {
    try {
      await connectToDatabase();
      const snapshot = await gatherLatestSnapshot();
      io.emit("network:update", snapshot);
    } catch (error) {
      console.error("⚠️ Failed to broadcast real-time update:", (error as Error).message);
    }
  }, intervalMs);

  console.log(`📡 Real-time broadcast active — pushing updates every ${intervalMs / 1000}s`);

  return io;
}
