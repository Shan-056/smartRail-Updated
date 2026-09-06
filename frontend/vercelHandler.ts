// ============================================================
// frontend/vercelHandler.ts
// ------------------------------------------------------------
// Deployable Vercel Serverless Function entry point.
// Delegates incoming HTTP requests to the embedded Express demo
// server, allowing the frontend to run with full digital twin
// simulation on Vercel without requiring MongoDB or FastAPI.
// ============================================================

import type { IncomingMessage, ServerResponse } from "http";
import { demoApp } from "./demoServer";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Main Vercel serverless request handler
 */
export default function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  return demoApp(req as any, res as any);
}

// Support standalone execution via: node/ts-node vercelHandler.ts
if (typeof process !== "undefined" && process.env.RUN_STANDALONE === "true") {
  const PORT = process.env.PORT || 3001;
  demoApp.listen(PORT, () => {
    console.log(`🚆 SmartRail Digital Twin Demo Server running at http://localhost:${PORT}`);
  });
}
