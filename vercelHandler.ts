// ============================================================
// vercelHandler.ts
// ------------------------------------------------------------
// Root deployable Vercel Serverless Function entry point.
// Delegates incoming HTTP requests to the embedded Express demo
// server inside frontend, allowing full standalone digital twin
// simulation without external database dependencies.
// ============================================================

import type { IncomingMessage, ServerResponse } from "http";
import { demoApp } from "./frontend/demoServer";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  return demoApp(req as any, res as any);
}

// Standalone execution support
if (typeof process !== "undefined" && process.env.RUN_STANDALONE === "true") {
  const PORT = process.env.PORT || 3001;
  demoApp.listen(PORT, () => {
    console.log(`🚆 SmartRail Digital Twin Demo Server running at http://localhost:${PORT}`);
  });
}
