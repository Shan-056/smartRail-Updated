// ============================================================
// server.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the actual "start button" for the whole backend when
// you need WebSockets working (which this project does — see
// websocket/socketServer.ts for why a custom server is needed).
//
// Normally, Next.js starts itself with "next dev" / "next start".
// But those built-in commands don't give us a way to also attach
// a Socket.IO server to the same port. So this file manually:
//   1. Prepares the Next.js app
//   2. Creates one raw HTTP server that handles BOTH normal
//      page/API requests (handed off to Next.js) AND WebSocket
//      connections (handed off to Socket.IO)
//   3. Starts listening, and starts the real-time broadcast loop
//
// package.json's "dev"/"start" scripts run this file instead of
// the default "next dev"/"next start".
// ============================================================

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initRealtimeServer } from "./websocket/socketServer";
import { connectToDatabase } from "./lib/mongodb";
import { seedStateFromLatestCrowdLogs } from "./services/digitalTwin";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 5000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Warm-start the digital twin's in-memory station state from the
  // most recent saved crowd readings, so /api/heatmap has real data
  // right away instead of showing all-zero occupancy after a restart.
  await connectToDatabase();
  await seedStateFromLatestCrowdLogs();

  const httpServer = createServer((req, res) => {
    // Every normal HTTP request (pages, /api/* routes) is handed
    // straight to Next.js's own request handler.
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  // Attach the Socket.IO real-time layer to this same server/port
  initRealtimeServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`🚆 Backend server running on http://localhost:${port}`);
  });
});
