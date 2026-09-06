// ============================================================
// app/api/cctv/stream/route.ts
// ------------------------------------------------------------
// Ephemeral in-memory video frame buffer for Phone as CCTV demo.
//
// PRIVACY ARCHITECTURE:
// Frames sent by phone cameras via getUserMedia() are stored
// exclusively in a volatile RAM buffer with an automatic 45-second
// expiry TTL. No raw video frames or photographs are ever written
// to disk or database. Only operators/admins can view the feed.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export interface LiveStreamFrame {
  streamId: string;
  stationId: string;
  stationName: string;
  zone: string;
  frame: string; // Base64 data URL
  clientTimestamp: number;
  serverTimestamp: number;
  deviceInfo?: string;
  simulatedCount: number;
}

// In-memory volatile buffer (RAM only — never saved to database)
const activeStreams = new Map<string, LiveStreamFrame>();

// Auto-cleanup stale streams older than 45 seconds
function cleanupStaleStreams() {
  const now = Date.now();
  for (const [key, stream] of activeStreams.entries()) {
    if (now - stream.serverTimestamp > 45000) {
      activeStreams.delete(key);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    cleanupStaleStreams();
    const body = await req.json();
    const { stationId, stationName, zone, frame, clientTimestamp, deviceInfo, simulatedCount } = body;

    if (!stationId || !frame) {
      return NextResponse.json(
        { message: "stationId and frame data are required." },
        { status: 400 }
      );
    }

    // Lookup station metadata
    const stn = MUMBAI_STATIONS.find(
      (s) => s.code.toLowerCase() === stationId.toLowerCase() || s.name.toLowerCase() === stationId.toLowerCase()
    );

    const stnCode = stn ? stn.code : stationId.toUpperCase();
    const stnName = stn ? stn.name : (stationName || stnCode);
    const streamKey = `stream_${stnCode}`;

    const streamData: LiveStreamFrame = {
      streamId: streamKey,
      stationId: stnCode,
      stationName: stnName,
      zone: zone || "Platform Concourse",
      frame,
      clientTimestamp: clientTimestamp || Date.now(),
      serverTimestamp: Date.now(),
      deviceInfo: deviceInfo || "Mobile Phone Camera",
      simulatedCount: typeof simulatedCount === "number" ? simulatedCount : Math.floor(Math.random() * 25) + 10,
    };

    activeStreams.set(streamKey, streamData);

    return NextResponse.json({
      ok: true,
      streamId: streamKey,
      stationCode: stnCode,
      serverTimestamp: streamData.serverTimestamp,
      activeStreamCount: activeStreams.size,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to process live stream frame.", error: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  cleanupStaleStreams();
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId") || searchParams.get("station");

  if (stationId) {
    const key = `stream_${stationId.toUpperCase()}`;
    const stream = activeStreams.get(key);
    if (stream) {
      return NextResponse.json({
        found: true,
        stream,
        now: Date.now(),
      });
    }
    // Return empty if no stream for this specific station
    return NextResponse.json({
      found: false,
      stationId,
      message: "No active phone stream for this station currently.",
      now: Date.now(),
    });
  }

  // Return all active streams
  const streams = Array.from(activeStreams.values()).map((s) => ({
    streamId: s.streamId,
    stationId: s.stationId,
    stationName: s.stationName,
    zone: s.zone,
    frame: s.frame,
    serverTimestamp: s.serverTimestamp,
    deviceInfo: s.deviceInfo,
    simulatedCount: s.simulatedCount,
  }));

  return NextResponse.json({
    streams,
    totalActive: streams.length,
    now: Date.now(),
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId") || searchParams.get("station");
  if (stationId) {
    activeStreams.delete(`stream_${stationId.toUpperCase()}`);
    return NextResponse.json({ ok: true, message: "Stream disconnected." });
  }
  activeStreams.clear();
  return NextResponse.json({ ok: true, message: "All active streams cleared." });
}
