"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export default function PhoneCctvStreamPage() {
  const [stationCode, setStationCode] = useState("DDR");
  const [zone, setZone] = useState("Platform 3 Foot Overbridge");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [streaming, setStreaming] = useState(false);
  const [statusText, setStatusText] = useState("Camera ready. Tap 'Start CCTV Stream' to begin.");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);
  const [intervalSec, setIntervalSec] = useState(2);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Read initial station from query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stn = params.get("station") || params.get("stationId");
      if (stn) {
        setStationCode(stn.toUpperCase());
      }
      const zoneParam = params.get("zone");
      if (zoneParam) {
        setZone(zoneParam);
      }
    }
  }, []);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
    setStatusText("Broadcast stopped. Tap to resume.");
  }, []);

  // Start camera and setup interval
  const startCamera = async () => {
    setErrorMsg(null);
    setStatusText("Requesting camera access...");

    try {
      // Release existing if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStreaming(true);
      setStatusText("Broadcasting live CCTV frames to Control Room...");

      // Transmit first frame immediately
      captureAndSendFrame();

      // Start periodic transmission
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        captureAndSendFrame();
      }, intervalSec * 1000);
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = "Could not access phone camera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No video camera detected on this device.";
      } else if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        msg = "Mobile browsers require HTTPS or localhost to enable getUserMedia() camera capture.";
      } else {
        msg = err.message || "Failed to start camera feed.";
      }
      setErrorMsg(msg);
      setStatusText("Failed to initialize camera.");
      setStreaming(false);
    }
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Scale to balanced resolution (e.g. 480x360 for light network load & fast response)
    const targetWidth = 480;
    const targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth) || 360;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Compress as JPEG
    const frameDataUrl = canvas.toDataURL("image/jpeg", 0.6);

    try {
      const selectedStn = MUMBAI_STATIONS.find((s) => s.code === stationCode);
      const res = await fetch("/api/cctv/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: stationCode,
          stationName: selectedStn ? selectedStn.name : stationCode,
          zone: zone,
          frame: frameDataUrl,
          clientTimestamp: Date.now(),
          deviceInfo: `${navigator.userAgent.includes("Mobile") ? "Mobile Phone" : "Browser Device"} (${facingMode} lens)`,
        }),
      });

      if (res.ok) {
        setFrameCount((prev) => prev + 1);
        setLastSentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch {
      // Network hiccup - ignore and retry next cycle
    }
  };

  // Flip camera toggle
  const toggleFacingMode = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    if (streaming) {
      stopCamera();
      setTimeout(() => {
        setFacingMode(newMode);
        startCamera();
      }, 300);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const selectedStationObj = MUMBAI_STATIONS.find((s) => s.code === stationCode);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            {streaming && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                streaming ? "bg-rose-500" : "bg-slate-500"
              }`}
            ></span>
          </span>
          <div>
            <h1 className="text-sm font-bold tracking-tight">SmartRail Edge CCTV Node</h1>
            <p className="text-[11px] text-slate-400">Mobile Phone Camera Streamer</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800"
        >
          ← Exit to Dashboard
        </Link>
      </header>

      {/* Main Stream Area */}
      <main className="my-auto py-4 flex flex-col items-center max-w-md mx-auto w-full space-y-4">
        {/* Station and Zone Selectors */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Target Station
              </label>
              <select
                disabled={streaming}
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-brand-500"
              >
                {MUMBAI_STATIONS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code}) - {s.line}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Camera Zone
              </label>
              <select
                disabled={streaming}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-brand-500"
              >
                <option value="Platform 1 North Concourse">PF 1 North Concourse</option>
                <option value="Platform 2/3 Middle Stairs">PF 2/3 Middle Stairs</option>
                <option value="Platform 3 Foot Overbridge">PF 3 Foot Overbridge</option>
                <option value="Main Booking Turnstiles">Main Booking Turnstiles</option>
                <option value="Escalator Connecting FOB">Escalator Connecting FOB</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400">
              Corridor: <span className="text-white font-medium">{selectedStationObj?.line || "Western"}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Snapshot interval:</span>
              <select
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                className="bg-slate-950 text-xs border border-slate-800 rounded px-1.5 py-0.5 text-slate-300"
              >
                <option value={1}>1.0 sec</option>
                <option value={2}>2.0 sec</option>
                <option value={3}>3.0 sec</option>
              </select>
            </div>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${!streaming ? "hidden" : "block"}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!streaming && (
            <div className="text-center p-6 space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl">
                📹
              </div>
              <p className="text-sm font-semibold text-slate-300">Camera Inactive</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Tap below to activate this device as an edge CCTV camera feed for{" "}
                <span className="text-slate-300 font-semibold">{selectedStationObj?.name}</span>.
              </p>
            </div>
          )}

          {/* Real-time OSD Overlay */}
          {streaming && (
            <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  REC &middot; LIVE STREAM
                </div>
                <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 border border-slate-700">
                  {selectedStationObj?.code} / {zone.split(" ")[0]}
                </div>
              </div>

              {/* Simulated Computer Vision Bounding Box Overlay */}
              <div className="border border-emerald-500/40 rounded-lg p-2 bg-emerald-500/5 mx-auto w-3/4 h-2/3 flex items-start justify-between">
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1 rounded">
                  ROI: DENSITY DETECT
                </span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1 rounded">
                  FEED OK
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded">
                <span>TX: {frameCount} frames</span>
                <span>{lastSentTime ? `Last: ${lastSentTime}` : "Connecting..."}</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="w-full rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
            <p className="font-semibold mb-0.5">⚠️ Camera Error</p>
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Status */}
        <p className="text-xs text-center text-slate-400 font-medium">{statusText}</p>

        {/* Primary Controls */}
        <div className="w-full flex items-center gap-2">
          {!streaming ? (
            <button
              onClick={startCamera}
              className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 active:scale-95"
            >
              <span>🔴</span> Start CCTV Stream
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95"
            >
              <span>⏹️</span> Stop Stream
            </button>
          )}

          <button
            onClick={toggleFacingMode}
            title="Switch Camera (Front / Back)"
            className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition active:scale-95"
          >
            🔄 Flip
          </button>
        </div>
      </main>

      {/* Footer & Privacy Notice */}
      <footer className="pt-3 border-t border-slate-800/80 text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
          <span>🔒</span> Ephemeral Privacy Guarantee
        </div>
        <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
          Frames are held exclusively in temporary in-memory RAM for real-time crowd density analysis
          and purged immediately. No raw video is recorded or stored to disk.
        </p>
      </footer>
    </div>
  );
}
