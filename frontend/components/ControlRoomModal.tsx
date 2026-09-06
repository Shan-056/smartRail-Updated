"use client";

import { useState, useEffect, useCallback } from "react";
import { Station } from "@/lib/network";
import { useAuth } from "@/lib/AuthProvider";

interface ControlRoomModalProps {
  stations: Station[];
  onClose: () => void;
}

interface AdvisoryData {
  summary: string;
  keyInsights: string[];
  recommendedActions: string[];
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  source: string;
  timestamp: string;
}

interface CameraItem {
  id: string;
  stationId: string;
  stationName: string;
  label: string;
  status: "disconnected" | "connected";
  addedBy: string;
  addedAt: string;
}

interface StationCameraStatus {
  stationId: string;
  stationName: string;
  code: string;
  line: string;
  cameras: CameraItem[];
  hasConnectedDevice: boolean;
}

interface CrowdOverrideItem {
  stationId: string;
  stationName: string;
  level: "low" | "medium" | "high" | "critical";
  densityPercent: number;
  reason?: string;
  setBy: string;
  setAt: string;
  active: boolean;
}

interface AlertItem {
  id: string;
  stationId: string;
  stationName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface LiveStreamInfo {
  streamId: string;
  stationId: string;
  stationName: string;
  zone: string;
  frame: string;
  serverTimestamp: number;
  deviceInfo?: string;
  simulatedCount?: number;
}

export default function ControlRoomModal({ stations, onClose }: ControlRoomModalProps) {
  const { user, switchRole } = useAuth();
  const isAdmin = user?.role === "admin";
  const isOperator = user?.role === "operator";
  const canManageOperations = isAdmin || isOperator;

  // Default active tab based on role
  const [activeTab, setActiveTab] = useState<
    "cameras" | "crowd-override" | "alerts" | "advisory" | "telemetry" | "cctv"
  >(canManageOperations ? "cameras" : "alerts");

  // Keep tab in sync if user elevates role
  useEffect(() => {
    if (canManageOperations && activeTab === "alerts") {
      // User can stay or switch
    }
  }, [canManageOperations, activeTab]);

  // Advisory State
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");

  // Cameras State
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [stationCameraList, setStationCameraList] = useState<StationCameraStatus[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(false);
  const [newCamStation, setNewCamStation] = useState(stations[0]?.code || "CCG");
  const [newCamLabel, setNewCamLabel] = useState("");
  const [camActionLoading, setCamActionLoading] = useState(false);
  const [cameraFilterLine, setCameraFilterLine] = useState<string>("All");

  // Phone as CCTV Demo State
  const [demoStation, setDemoStation] = useState("DDR");
  const [livePhoneStream, setLivePhoneStream] = useState<LiveStreamInfo | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [simulatingPhone, setSimulatingPhone] = useState(false);
  const [streamHeartbeat, setStreamHeartbeat] = useState(0);

  // Crowd Override State
  const [overrides, setOverrides] = useState<CrowdOverrideItem[]>([]);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideStation, setOverrideStation] = useState(stations[0]?.code || "CCG");
  const [overrideLevel, setOverrideLevel] = useState<"low" | "medium" | "high" | "critical">("high");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideActionLoading, setOverrideActionLoading] = useState(false);

  // Alerts State
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [newAlertStation, setNewAlertStation] = useState("ALL");
  const [newAlertSeverity, setNewAlertSeverity] = useState<"info" | "warning" | "critical">("warning");
  const [newAlertMessage, setNewAlertMessage] = useState("");
  const [alertActionLoading, setAlertActionLoading] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  // --- Load AI Advisory ---
  const loadAdvisory = useCallback(async () => {
    setAdvisoryLoading(true);
    try {
      const res = await fetch("/api/ai/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selectedStationId || undefined,
          query: customQuery || undefined,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAdvisory(json.data);
      }
    } catch (e) {
      console.error("Advisory error:", e);
    } finally {
      setAdvisoryLoading(false);
    }
  }, [selectedStationId, customQuery]);

  // --- Load Cameras (Admin & Operator only) ---
  const loadCameras = useCallback(async () => {
    if (!canManageOperations) return;
    setCamerasLoading(true);
    try {
      const res = await fetch("/api/control-room/cameras");
      if (res.ok) {
        const data = await res.json();
        setCameras(data.cameras || []);
        setStationCameraList(data.stationStatusList || []);
      }
    } catch (e) {
      console.error("Camera load error:", e);
    } finally {
      setCamerasLoading(false);
    }
  }, [canManageOperations]);

  // --- Load Overrides (Admin & Operator only) ---
  const loadOverrides = useCallback(async () => {
    if (!canManageOperations) return;
    setOverrideLoading(true);
    try {
      const res = await fetch("/api/control-room/crowd-override");
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || []);
      }
    } catch (e) {
      console.error("Override load error:", e);
    } finally {
      setOverrideLoading(false);
    }
  }, [canManageOperations]);

  // --- Load Alerts (All roles, passenger read-only) ---
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      console.error("Alerts load error:", e);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "advisory") {
      loadAdvisory();
    } else if (activeTab === "cameras" && canManageOperations) {
      loadCameras();
    } else if (activeTab === "crowd-override" && canManageOperations) {
      loadOverrides();
    } else if (activeTab === "alerts") {
      loadAlerts();
    }
  }, [activeTab, canManageOperations, loadAdvisory, loadCameras, loadOverrides, loadAlerts]);

  // --- Check / Poll Live Phone CCTV Stream ---
  const checkPhoneStream = useCallback(async () => {
    try {
      const res = await fetch(`/api/cctv/stream?stationId=${demoStation}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.stream) {
          setLivePhoneStream(data.stream);
          setStreamHeartbeat((prev) => prev + 1);
        } else {
          setLivePhoneStream(null);
        }
      }
    } catch {
      // ignore
    }
  }, [demoStation]);

  useEffect(() => {
    if (activeTab === "cameras") {
      checkPhoneStream();
      const interval = setInterval(checkPhoneStream, 1500);
      return () => clearInterval(interval);
    }
  }, [activeTab, checkPhoneStream]);

  // --- Disconnect Live Phone Stream ---
  const handleDisconnectStream = async () => {
    setSimulatingPhone(false);
    try {
      await fetch(`/api/cctv/stream?stationId=${demoStation}`, { method: "DELETE" });
      setLivePhoneStream(null);
    } catch {
      // ignore
    }
  };

  // --- Virtual CCTV Feed Simulator (For Instant Showcase) ---
  useEffect(() => {
    if (!simulatingPhone) return;

    let frameIdx = 0;
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");

    const interval = setInterval(async () => {
      if (!ctx) return;
      frameIdx++;

      // Draw suburban railway platform CCTV frame
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 480, 360);

      // Station Platform Deck
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 110, 480, 250);

      // Platform edge tactile yellow safety line
      ctx.fillStyle = "#eab308";
      ctx.fillRect(0, 300, 480, 16);
      ctx.fillStyle = "#020617";
      for (let x = 0; x < 480; x += 36) {
        ctx.fillRect(x, 300, 18, 16);
      }

      // Ballast and tracks
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 316, 480, 44);

      // EMU Train coach alongside platform
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(0, 0, 480, 100);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 25, 480, 25);
      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 13px monospace";
      ctx.fillText("MUMBAI SUBURBAN FAST EMU - PLATFORM 3", 40, 43);

      // Moving simulated passengers
      const passengerCount = 12 + (frameIdx % 10);
      for (let i = 0; i < passengerCount; i++) {
        const px = 40 + ((i * 42 + frameIdx * 10) % 400);
        const py = 150 + ((i * 32) % 120);

        // Person avatar
        ctx.fillStyle = i % 3 === 0 ? "#38bdf8" : i % 2 === 0 ? "#f43f5e" : "#fbbf24";
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(px - 5, py + 9, 10, 20);

        // Edge detection bounding box
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(px - 12, py - 12, 24, 44);
        ctx.fillStyle = "#10b981";
        ctx.font = "8px monospace";
        ctx.fillText(`P${i + 1} 96%`, px - 12, py - 14);
      }

      // OSD HUD overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(10, 10, 260, 46);
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`EDGE CCTV VIRTUAL NODE: ${demoStation}`, 18, 26);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px monospace";
      ctx.fillText(`RATE: 2.0s | DETECTIONS: ${passengerCount} | FRAME #${frameIdx}`, 18, 42);

      const frameData = canvas.toDataURL("image/jpeg", 0.6);

      try {
        const stn = stations.find((s) => s.code === demoStation);
        await fetch("/api/cctv/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stationId: demoStation,
            stationName: stn ? stn.name : demoStation,
            zone: "Platform 3 Foot Overbridge",
            frame: frameData,
            clientTimestamp: Date.now(),
            deviceInfo: "Edge CCTV Simulator (Virtual Device)",
            simulatedCount: passengerCount,
          }),
        });
        checkPhoneStream();
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [simulatingPhone, demoStation, stations, checkPhoneStream]);

  // --- Add Camera (Admin only) ---
  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamLabel.trim()) return;
    setCamActionLoading(true);
    try {
      const stn = stations.find((s) => s.code === newCamStation);
      const res = await fetch("/api/control-room/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: newCamStation,
          stationName: stn?.name || newCamStation,
          label: newCamLabel.trim(),
        }),
      });
      if (res.ok) {
        setNewCamLabel("");
        loadCameras();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to add camera.");
      }
    } catch {
      alert("Network error adding camera.");
    } finally {
      setCamActionLoading(false);
    }
  };

  // --- Delete Camera (Admin only) ---
  const handleDeleteCamera = async (camId: string) => {
    if (!confirm("Are you sure you want to disconnect and remove this camera endpoint?")) return;
    try {
      const res = await fetch(`/api/control-room/cameras/${camId}`, { method: "DELETE" });
      if (res.ok) {
        loadCameras();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to remove camera.");
      }
    } catch {
      alert("Network error deleting camera.");
    }
  };

  // --- Apply Crowd Override (Admin & Operator) ---
  const handleSetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideActionLoading(true);
    try {
      const stn = stations.find((s) => s.code === overrideStation);
      const res = await fetch("/api/control-room/crowd-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: overrideStation,
          stationName: stn?.name || overrideStation,
          level: overrideLevel,
          reason: overrideReason.trim(),
        }),
      });
      if (res.ok) {
        setOverrideReason("");
        loadOverrides();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to set crowd override.");
      }
    } catch {
      alert("Network error setting override.");
    } finally {
      setOverrideActionLoading(false);
    }
  };

  // --- Clear Crowd Override (Admin & Operator) ---
  const handleClearOverride = async (stnCode: string) => {
    try {
      const res = await fetch(`/api/control-room/crowd-override?stationId=${stnCode}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadOverrides();
      }
    } catch {
      alert("Network error clearing override.");
    }
  };

  // --- Create Alert (Admin & Operator) ---
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertMessage.trim()) return;
    setAlertActionLoading(true);
    setAlertError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: newAlertStation,
          severity: newAlertSeverity,
          message: newAlertMessage.trim(),
        }),
      });
      if (res.ok) {
        setNewAlertMessage("");
        loadAlerts();
      } else {
        const err = await res.json();
        setAlertError(err.message || "Failed to broadcast alert.");
      }
    } catch {
      setAlertError("Network error creating alert.");
    } finally {
      setAlertActionLoading(false);
    }
  };

  // --- Resolve Alert (Admin & Operator) ---
  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, { method: "POST" });
      if (res.ok) {
        loadAlerts();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to resolve alert.");
      }
    } catch {
      alert("Network error resolving alert.");
    }
  };

  // --- Delete Alert (Admin only) ---
  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("Permanently delete this alert record?")) return;
    try {
      const res = await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
      if (res.ok) {
        loadAlerts();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to delete alert.");
      }
    } catch {
      alert("Network error deleting alert.");
    }
  };

  // Filter station list for camera tab
  const filteredStationCameras = stationCameraList.filter((stn) => {
    if (cameraFilterLine === "All") return true;
    return stn.line === cameraFilterLine;
  });

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[rgb(var(--border))] px-5 py-3.5 gap-3 bg-[rgb(var(--surface-2))]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Operations Control Room (OCC)</h2>
                {/* Instant Role Switcher for seamless testing */}
                <select
                  value={user?.role || "passenger"}
                  onChange={(e) => {
                    const newRole = e.target.value as "admin" | "operator" | "passenger";
                    switchRole(newRole);
                    if (newRole !== "passenger" && activeTab === "alerts") {
                      setActiveTab("cameras");
                    }
                  }}
                  title="Switch user role for testing"
                  className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border outline-none ${
                    isAdmin
                      ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40"
                      : isOperator
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
                      : "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40"
                  }`}
                >
                  <option value="admin">Admin (Full OCC)</option>
                  <option value="operator">Operator (CCTV/Alerts)</option>
                  <option value="passenger">Passenger (Read-only)</option>
                </select>
              </div>
              <p className="text-xs text-[rgb(var(--text-muted))]">Mumbai Suburban Digital Twin & Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex flex-wrap rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-0.5 text-xs">
              {/* Camera Feeds Tab: Rendered ONLY for Admin & Operator, NOT for Passenger */}
              {canManageOperations && (
                <button
                  onClick={() => setActiveTab("cameras")}
                  className={`rounded-lg px-2.5 py-1 font-medium transition ${
                    activeTab === "cameras" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  📹 Camera Feeds
                </button>
              )}

              {/* Crowd Override Tab: Rendered ONLY for Admin & Operator, NOT for Passenger */}
              {canManageOperations && (
                <button
                  onClick={() => setActiveTab("crowd-override")}
                  className={`rounded-lg px-2.5 py-1 font-medium transition ${
                    activeTab === "crowd-override" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  ⚡ Crowd Override
                </button>
              )}

              {/* Alerts Tab: Available to all, passenger sees read-only */}
              <button
                onClick={() => setActiveTab("alerts")}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  activeTab === "alerts" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                }`}
              >
                🚨 Alerts
              </button>

              <button
                onClick={() => setActiveTab("advisory")}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  activeTab === "advisory" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                }`}
              >
                AI Advisory
              </button>

              <button
                onClick={() => setActiveTab("telemetry")}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  activeTab === "telemetry" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                }`}
              >
                Digital Twin
              </button>

              <button
                onClick={() => setActiveTab("cctv")}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  activeTab === "cctv" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                }`}
              >
                CCTV Anomaly
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Passenger Helper Banner */}
          {!canManageOperations && (
            <div className="flex flex-wrap items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs mb-4 text-blue-700 dark:text-blue-300 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <div>
                  <span className="font-semibold">Viewing in Passenger Role (Read-only Alerts & Advisory).</span>
                  <p className="text-[11px] opacity-90">
                    To test Camera Feeds, Phone as CCTV, and Operations controls, switch your role below:
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    switchRole("admin");
                    setActiveTab("cameras");
                  }}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition shadow-sm"
                >
                  ⚡ Switch to Admin
                </button>
                <button
                  onClick={() => {
                    switchRole("operator");
                    setActiveTab("cameras");
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-sm"
                >
                  ⚡ Switch to Operator
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: CAMERA CONNECTIONS (Admin + Operator only) */}
          {/* ======================================================== */}
          {activeTab === "cameras" && canManageOperations && (
            <div className="space-y-5">
              {/* ==================================================== */}
              {/* CCTV DEMO SECTION: PHONE AS CCTV CAMERA (SHOWCASE) */}
              {/* ==================================================== */}
              <div className="rounded-2xl border-2 border-brand-500/40 bg-[rgb(var(--surface-2))] p-4 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-600/15 text-brand-600 text-sm font-bold dark:text-brand-400">
                      📱
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[rgb(var(--text))]">
                          CCTV Demo: Phone as Station Camera
                        </h3>
                        <span className="rounded-full bg-brand-600/20 px-2 py-0.5 text-[9px] font-extrabold text-brand-600 uppercase tracking-wide dark:text-brand-400">
                          Showcase Feature
                        </span>
                      </div>
                      <p className="text-[11px] text-[rgb(var(--text-muted))]">
                        Stream live edge camera frames from any phone or webcam browser via getUserMedia() directly into the OCC.
                      </p>
                    </div>
                  </div>

                  {/* Station Selector for CCTV Demo */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-[rgb(var(--text-muted))]">
                      Select Station:
                    </label>
                    <select
                      value={demoStation}
                      onChange={(e) => {
                        setDemoStation(e.target.value);
                        setSimulatingPhone(false);
                      }}
                      className="rounded-xl border border-brand-500/40 bg-[rgb(var(--surface))] px-3 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 outline-none focus:ring-2 focus:ring-brand-500/30"
                    >
                      {stations.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code}) - {s.line}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CCTV Showcase Grid: Monitor on Left, Pairing Controls on Right */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  {/* Monitor Viewport (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-2.5 shadow-inner">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black flex items-center justify-center border border-slate-800/80">
                      {livePhoneStream ? (
                        <>
                          {/* Live Frame Image */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={livePhoneStream.frame}
                            alt="Live Phone CCTV Feed"
                            className="h-full w-full object-cover"
                          />

                          {/* HUD Overlay */}
                          <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <div className="bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-rose-400 border border-rose-500/40 flex items-center gap-1.5 shadow">
                                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                                LIVE FEED &middot; {livePhoneStream.stationId}
                              </div>
                              <div className="bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/40">
                                FPS: ~15 &middot; HB: #{streamHeartbeat}
                              </div>
                            </div>

                            {/* Simulated CV Bounding Box Target */}
                            <div className="mx-auto w-3/4 h-3/5 rounded border border-emerald-400/60 bg-emerald-500/10 p-2 flex flex-col justify-between">
                              <div className="flex justify-between text-[9px] font-mono text-emerald-300">
                                <span>ROI: PLATFORM FLOW</span>
                                <span>CONF: 94.8%</span>
                              </div>
                              <div className="text-center text-[10px] font-mono text-emerald-200 bg-black/60 rounded px-1.5 py-0.5 self-center">
                                {livePhoneStream.simulatedCount || 16} PASSENGERS IN FRAME
                              </div>
                              <div className="text-right text-[9px] font-mono text-emerald-300">
                                ZONE: {livePhoneStream.zone}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/75 backdrop-blur-sm px-2 py-1 rounded">
                              <span>DEVICE: {livePhoneStream.deviceInfo || "Edge Mobile Camera"}</span>
                              <span>
                                LAST: {Math.max(0, Math.round((Date.now() - livePhoneStream.serverTimestamp) / 1000))}s ago
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Standby Screen when no phone is connected */
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-3xl shadow">
                            📡
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200">
                              Awaiting Phone Camera Stream for {stations.find((s) => s.code === demoStation)?.name || demoStation} ({demoStation})
                            </p>
                            <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                              Connect a phone browser or webcam to broadcast live footage to this station monitor.
                            </p>
                          </div>

                          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSimulatingPhone(true);
                              }}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm active:scale-95"
                            >
                              ▶ Run Virtual Camera Simulation
                            </button>
                            <a
                              href={`/cctv-stream?station=${demoStation}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-brand-600 hover:bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm active:scale-95"
                            >
                              🔗 Open Webcam in Split Tab
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stream Actions underneath screen */}
                    <div className="mt-2.5 flex items-center justify-between px-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            livePhoneStream ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
                          }`}
                        />
                        <span className="text-[11px] font-medium text-slate-300">
                          {livePhoneStream
                            ? `Connected: ${livePhoneStream.deviceInfo || "Phone Node"}`
                            : "Status: Standby (Ready to connect)"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {simulatingPhone && (
                          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded font-mono">
                            SIMULATING
                          </span>
                        )}
                        {livePhoneStream && (
                          <button
                            onClick={handleDisconnectStream}
                            className="rounded bg-rose-600/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-600/30 transition"
                          >
                            Disconnect Stream
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pairing & Connection Panel (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3.5 text-xs">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1">
                        Connect Phone Camera
                      </h4>
                      <p className="text-[11px] text-[rgb(var(--text-muted))]">
                        Target:{" "}
                        <strong className="text-[rgb(var(--text))]">
                          {stations.find((s) => s.code === demoStation)?.name || demoStation} ({demoStation})
                        </strong>
                      </p>
                    </div>

                    {/* Pairing Link */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-[rgb(var(--text-muted))]">
                        Direct Phone Streamer URL:
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={
                            typeof window !== "undefined"
                              ? `${window.location.origin}/cctv-stream?station=${demoStation}`
                              : `/cctv-stream?station=${demoStation}`
                          }
                          className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-2.5 py-1 text-[11px] font-mono text-[rgb(var(--text))] outline-none"
                        />
                        <button
                          onClick={() => {
                            const url =
                              typeof window !== "undefined"
                                ? `${window.location.origin}/cctv-stream?station=${demoStation}`
                                : `/cctv-stream?station=${demoStation}`;
                            navigator.clipboard.writeText(url);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 transition"
                        >
                          {copiedLink ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowQrCode((prev) => !prev)}
                        className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] py-2 px-2 text-center font-semibold text-[rgb(var(--text))] hover:bg-[rgb(var(--border))]/50 transition"
                      >
                        {showQrCode ? "Hide QR Code" : "📱 Scan QR Code"}
                      </button>

                      <a
                        href={`/cctv-stream?station=${demoStation}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-slate-900 border border-slate-700 py-2 px-2 text-center font-semibold text-slate-100 hover:bg-slate-800 transition"
                      >
                        💻 Test Local Cam
                      </a>
                    </div>

                    {/* QR Code Display Modal / Box */}
                    {showQrCode && (
                      <div className="flex flex-col items-center rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 text-center space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                            typeof window !== "undefined"
                              ? `${window.location.origin}/cctv-stream?station=${demoStation}`
                              : `http://localhost:3000/cctv-stream?station=${demoStation}`
                          )}`}
                          alt="CCTV Connect QR Code"
                          className="h-32 w-32 rounded-lg bg-white p-1.5 shadow"
                        />
                        <p className="text-[10px] text-[rgb(var(--text-muted))]">
                          Scan with your phone camera to open the edge stream node directly for {demoStation}.
                        </p>
                      </div>
                    )}

                    {/* Privacy Guarantee Card */}
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold mb-0.5">
                        <span>🔒</span> Ephemeral Privacy Guarantee
                      </div>
                      <p className="text-[10px] opacity-90 leading-tight">
                        Frames sent by phone cameras are held in volatile RAM only (auto-purged after 45s). No raw frames or faces are recorded to disk or database. Feeds are strictly restricted to OCC Operators and Admins.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Context Bar */}
              <div className="flex flex-wrap items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-xs">
                <div>
                  <span className="font-semibold text-[rgb(var(--text))]">
                    Edge Station CCTV Device Scaffolding
                  </span>
                  <p className="text-[rgb(var(--text-muted))] mt-0.5">
                    {isAdmin
                      ? "Admin Mode: You have full privileges to register, provision, and remove edge camera feeds."
                      : "Operator Mode (View Only): You can inspect connected camera devices and statuses across stations."}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">Filter Line:</span>
                  <select
                    value={cameraFilterLine}
                    onChange={(e) => setCameraFilterLine(e.target.value)}
                    className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1 text-xs"
                  >
                    <option value="All">All Lines</option>
                    <option value="Western">Western</option>
                    <option value="Central">Central</option>
                    <option value="Harbour">Harbour</option>
                  </select>
                </div>
              </div>

              {/* Admin "+ Add Camera" Form */}
              {isAdmin && (
                <form
                  onSubmit={handleAddCamera}
                  className="rounded-xl border border-brand-600/30 bg-brand-600/5 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      + Connect Edge Camera Feed
                    </h3>
                    <span className="text-[10px] text-[rgb(var(--text-muted))]">Admin exclusive</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr,2fr,auto]">
                    <div>
                      <label className="block text-[10px] font-medium text-[rgb(var(--text-muted))] mb-1">
                        Station
                      </label>
                      <select
                        value={newCamStation}
                        onChange={(e) => setNewCamStation(e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs font-medium"
                      >
                        {stations.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-[rgb(var(--text-muted))] mb-1">
                        Camera Label / Location
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. PF 1 North Escalator Concourse Cam 01"
                        value={newCamLabel}
                        onChange={(e) => setNewCamLabel(e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={camActionLoading}
                        className="w-full sm:w-auto rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
                      >
                        {camActionLoading ? "Adding..." : "Add Camera"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Station CCTV Status Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                    Suburban Network Station Feeds ({filteredStationCameras.length} stations)
                  </h3>
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">
                    {cameras.length} active camera record{cameras.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {camerasLoading ? (
                  <p className="text-xs text-[rgb(var(--text-muted))] py-4 text-center">Loading camera telemetry...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredStationCameras.map((stn) => (
                      <div
                        key={stn.code}
                        className="flex flex-col justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-xs shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[rgb(var(--text))]">{stn.stationName}</span>
                              <span className="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5 text-[9px] font-bold text-brand-600 dark:text-brand-400">
                                {stn.code}
                              </span>
                            </div>
                            <span className="text-[10px] text-[rgb(var(--text-muted))]">{stn.line}</span>
                          </div>

                          {/* Default / Seed state: "No device connected" with "disconnected" status */}
                          {stn.cameras.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-2))]/60 p-3 text-center my-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-slate-400 dark:bg-zinc-500 mb-1" />
                              <p className="font-medium text-slate-500 dark:text-zinc-400 text-[11px]">
                                No device connected.
                              </p>
                              <span className="inline-block mt-1 rounded-full bg-slate-200 dark:bg-zinc-700 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-zinc-300">
                                Status: disconnected
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1.5 my-2">
                              {stn.cameras.map((c) => (
                                <div
                                  key={c.id}
                                  className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-2 flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-semibold text-[rgb(var(--text))]">{c.label}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[rgb(var(--text-muted))]">
                                      <span
                                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                                          c.status === "connected" ? "bg-emerald-500" : "bg-amber-500"
                                        }`}
                                      />
                                      <span>Status: {c.status}</span>
                                      <span>&middot; By {c.addedBy}</span>
                                    </div>
                                  </div>

                                  {/* Delete Camera button (Admin ONLY) */}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCamera(c.id)}
                                      title="Disconnect and remove camera"
                                      className="rounded p-1 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-1 pt-1.5 border-t border-[rgb(var(--border))]/50 text-[10px] text-[rgb(var(--text-muted))] flex items-center justify-between">
                          <span>{stn.cameras.length} camera feed{stn.cameras.length !== 1 ? "s" : ""}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewCamStation(stn.code);
                                setNewCamLabel(`PF 1 Concourse - ${stn.stationName}`);
                              }}
                              className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                            >
                              + Add to {stn.code}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CROWD OVERRIDE (Admin + Operator only) */}
          {/* ======================================================== */}
          {activeTab === "crowd-override" && canManageOperations && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <span className="text-base">⚡</span>
                <div>
                  <h4 className="font-bold">Manual Station Crowd Override Control</h4>
                  <p className="mt-0.5 leading-relaxed text-[11px]">
                    Operators and Admins can manually set a station crowd level to reflect sudden on-ground surges
                    (e.g., local festivals, rain diversions, track maintenance). Overrides coexist with system-calculated
                    levels and update passenger forecasts seamlessly.
                  </p>
                </div>
              </div>

              {/* Set Override Form */}
              <form
                onSubmit={handleSetOverride}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4 space-y-3"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  Set Manual Crowd Level
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[rgb(var(--text-muted))] mb-1">
                      Target Station
                    </label>
                    <select
                      value={overrideStation}
                      onChange={(e) => setOverrideStation(e.target.value)}
                      className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs font-medium"
                    >
                      {stations.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[rgb(var(--text-muted))] mb-1">
                      Override Crowd Level
                    </label>
                    <select
                      value={overrideLevel}
                      onChange={(e) => setOverrideLevel(e.target.value as any)}
                      className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs font-medium"
                    >
                      <option value="low">Low (Normal Flow ~28%)</option>
                      <option value="medium">Medium (Moderate Load ~56%)</option>
                      <option value="high">High (Peak Congestion ~82%)</option>
                      <option value="critical">Critical (Platform Surge Alert ~96%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[rgb(var(--text-muted))] mb-1">
                      Reason / Operational Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Festival crowd surge near FOB"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={overrideActionLoading}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    {overrideActionLoading ? "Applying..." : "Apply Crowd Override"}
                  </button>
                </div>
              </form>

              {/* Active Overrides vs Calculated Display */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  Active Manual Overrides ({overrides.length})
                </h3>

                {overrideLoading ? (
                  <p className="text-xs text-[rgb(var(--text-muted))]">Checking overrides...</p>
                ) : overrides.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-6 text-center text-xs text-[rgb(var(--text-muted))]">
                    No manual overrides currently active. All stations are reporting AI/model-computed levels.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {overrides.map((ovr) => (
                      <div
                        key={ovr.stationId}
                        className="rounded-xl border border-amber-500/30 bg-[rgb(var(--surface))] p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{ovr.stationName}</span>
                              <span className="rounded bg-brand-600/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-600">
                                {ovr.stationId}
                              </span>
                            </div>
                            {/* Manual Override distinguished badge */}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                                ⚠️ Operator Override: {ovr.level}
                              </span>
                              <span className="text-xs font-semibold">{ovr.densityPercent}% density</span>
                            </div>
                            {ovr.reason && (
                              <p className="mt-1.5 text-xs text-[rgb(var(--text))] italic">
                                &ldquo;{ovr.reason}&rdquo;
                              </p>
                            )}
                            <p className="mt-2 text-[10px] text-[rgb(var(--text-muted))]">
                              Set by <strong>{ovr.setBy}</strong> at {new Date(ovr.setAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleClearOverride(ovr.stationId)}
                            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
                          >
                            Reset to AI
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: OPERATIONS ALERTS (Role-gated controls) */}
          {/* ======================================================== */}
          {activeTab === "alerts" && (
            <div className="space-y-5">
              {/* Role Context */}
              <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-xs">
                <div>
                  <span className="font-semibold text-[rgb(var(--text))]">
                    Suburban Network Operations Alerts
                  </span>
                  <p className="text-[rgb(var(--text-muted))] mt-0.5">
                    {isAdmin
                      ? "Admin Mode: You can create alerts, acknowledge/resolve them, and permanently delete records."
                      : isOperator
                      ? "Operator Mode: You can create and resolve alerts. Deletion is restricted to Admins."
                      : "Passenger Mode: Viewing active broadcast alerts across Mumbai suburban stations."}
                  </p>
                </div>
              </div>

              {/* Alert Creation Form (Admin & Operator ONLY) */}
              {canManageOperations && (
                <form
                  onSubmit={handleCreateAlert}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4 space-y-3"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                    + Broadcast New Operations Alert
                  </h3>
                  {alertError && <p className="text-xs text-rose-500">{alertError}</p>}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1fr,2fr,auto]">
                    <div>
                      <label className="block text-[10px] font-medium text-[rgb(var(--text-muted))] mb-1">
                        Station / Scope
                      </label>
                      <select
                        value={newAlertStation}
                        onChange={(e) => setNewAlertStation(e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1.5 text-xs font-medium"
                      >
                        <option value="ALL">🌐 All Mumbai Network</option>
                        {stations.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-[rgb(var(--text-muted))] mb-1">
                        Severity
                      </label>
                      <select
                        value={newAlertSeverity}
                        onChange={(e) => setNewAlertSeverity(e.target.value as any)}
                        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1.5 text-xs font-medium"
                      >
                        <option value="info">ℹ️ Info</option>
                        <option value="warning">⚠️ Warning</option>
                        <option value="critical">🚨 Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-[rgb(var(--text-muted))] mb-1">
                        Alert Message
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Signal failure at Platform 2. Trains delayed by 10 mins."
                        value={newAlertMessage}
                        onChange={(e) => setNewAlertMessage(e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={alertActionLoading}
                        className="w-full sm:w-auto rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
                      >
                        {alertActionLoading ? "Pushing..." : "Push Alert"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Alert List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                    Broadcast Feed ({alerts.length} total)
                  </h3>
                  <button
                    onClick={loadAlerts}
                    className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {alertsLoading ? (
                  <p className="text-xs text-[rgb(var(--text-muted))]">Loading alerts...</p>
                ) : alerts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-6 text-center text-xs text-[rgb(var(--text-muted))]">
                    No operational alerts currently broadcast. Network operating normally.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {alerts.map((alt) => {
                      const isResolved = !!alt.resolvedAt;
                      return (
                        <div
                          key={alt.id}
                          className={`rounded-xl border p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isResolved
                              ? "border-[rgb(var(--border))] bg-[rgb(var(--surface-2))]/50 opacity-70"
                              : alt.severity === "critical"
                              ? "border-rose-500/40 bg-rose-500/10"
                              : alt.severity === "warning"
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-blue-500/40 bg-blue-500/10"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                  alt.severity === "critical"
                                    ? "bg-rose-500 text-white"
                                    : alt.severity === "warning"
                                    ? "bg-amber-500 text-white"
                                    : "bg-blue-500 text-white"
                                }`}
                              >
                                {alt.severity}
                              </span>
                              <span className="font-bold text-[rgb(var(--text))]">
                                {alt.stationId === "ALL" ? "🌐 Network Wide" : `${alt.stationName} (${alt.stationId})`}
                              </span>
                              {isResolved && (
                                <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold">
                                  Resolved
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-[rgb(var(--text))]">{alt.message}</p>
                            <div className="text-[10px] text-[rgb(var(--text-muted))] flex flex-wrap gap-2">
                              <span>By: {alt.createdBy}</span>
                              <span>&middot;</span>
                              <span>Posted: {new Date(alt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              {isResolved && (
                                <>
                                  <span>&middot;</span>
                                  <span>Resolved by: {alt.resolvedBy}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {/* Resolve button: Operator and Admin only */}
                            {canManageOperations && !isResolved && (
                              <button
                                type="button"
                                onClick={() => handleResolveAlert(alt.id)}
                                className="rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-600/20 transition"
                              >
                                ✓ Acknowledge & Resolve
                              </button>
                            )}

                            {/* Delete button: ONLY Admin */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAlert(alt.id)}
                                title="Permanently delete alert"
                                className="rounded-lg border border-rose-600/30 bg-rose-600/10 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-600/20 transition"
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: AI ADVISORY */}
          {/* ======================================================== */}
          {activeTab === "advisory" && (
            <div className="space-y-4">
              {/* Filter / Query Row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto]">
                <div className="flex gap-2">
                  <select
                    value={selectedStationId}
                    onChange={(e) => setSelectedStationId(e.target.value)}
                    className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-xs font-medium focus:outline-none"
                  >
                    <option value="">All Network Stations</option>
                    {stations.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Ask OCC advisory (e.g. 'Bottleneck at Dadar PF 3?')"
                    className="flex-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <button
                  onClick={loadAdvisory}
                  disabled={advisoryLoading}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {advisoryLoading ? "Analyzing..." : "Generate Advisory"}
                </button>
              </div>

              {/* Advisory Response Display */}
              {advisory ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                        Executive Operational Briefing
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            advisory.riskLevel === "CRITICAL"
                              ? "bg-red-500/20 text-red-600 dark:text-red-400"
                              : advisory.riskLevel === "HIGH"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {advisory.riskLevel} RISK
                        </span>
                        <span className="text-[10px] text-[rgb(var(--text-muted))]">
                          Engine: {advisory.source}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{advisory.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                      <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                        🔍 Key Data Insights
                      </h4>
                      <ul className="space-y-2 text-xs">
                        {advisory.keyInsights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-brand-600 dark:text-brand-400">•</span>
                            <span className="text-[rgb(var(--text))]">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                      <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                        ⚡ Recommended Controller Directives
                      </h4>
                      <ul className="space-y-2 text-xs">
                        {advisory.recommendedActions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                            <span className="text-[rgb(var(--text))]">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-xs text-[rgb(var(--text-muted))]">
                  {advisoryLoading ? "Formulating real-time advisory..." : "No advisory generated yet."}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: DIGITAL TWIN TELEMETRY */}
          {/* ======================================================== */}
          {activeTab === "telemetry" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">Active Trains</span>
                  <p className="text-xl font-bold">142</p>
                  <span className="text-[10px] text-emerald-600 font-medium">96.4% on time</span>
                </div>
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">ATVM Velocity</span>
                  <p className="text-xl font-bold">840 / min</p>
                  <span className="text-[10px] text-[rgb(var(--text-muted))]">Peak ticketing flow</span>
                </div>
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">UTS Transactions</span>
                  <p className="text-xl font-bold">1,210 / min</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Mobile QR active</span>
                </div>
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">Avg Network Load</span>
                  <p className="text-xl font-bold">58%</p>
                  <span className="text-[10px] text-amber-600 font-medium">Evening surge ready</span>
                </div>
              </div>

              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  Corridor Capacity & Headway Live Status
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Western Corridor (Churchgate - Virar)</span>
                      <span>62% load &middot; 3.2 min headway</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[rgb(var(--surface-2))]">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: "62%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Central Main Trunk (CSMT - Thane - Kalyan)</span>
                      <span>71% load &middot; 3.5 min headway</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[rgb(var(--surface-2))]">
                      <div className="h-2 rounded-full bg-rose-500" style={{ width: "71%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Kalyan - Kasara & Karjat Extensions</span>
                      <span>44% load &middot; 12 min headway</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[rgb(var(--surface-2))]">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: "44%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: CCTV ANOMALIES */}
          {/* ======================================================== */}
          {activeTab === "cctv" && (
            <div className="space-y-3">
              <p className="text-xs text-[rgb(var(--text-muted))]">
                Real-time edge CCTV computer-vision telemetry detecting platform bottleneck anomalies.
              </p>
              <div className="space-y-2">
                {[
                  { station: "Dadar (DDR)", zone: "PF 3 Foot Overbridge", status: "Slow Flow", density: "78%", color: "text-amber-500" },
                  { station: "Andheri (AND)", zone: "PF 1 Escalator Concourse", status: "Normal Throughput", density: "45%", color: "text-emerald-500" },
                  { station: "Thane (THN)", zone: "PF 5 Platform Middle", status: "Surge Alert", density: "88%", color: "text-rose-500" },
                  { station: "Churchgate (CCG)", zone: "Concourse Turnstiles", status: "Normal Throughput", density: "38%", color: "text-emerald-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-xs">
                    <div>
                      <span className="font-semibold">{item.station}</span> &middot; <span className="text-[rgb(var(--text-muted))]">{item.zone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[rgb(var(--text-muted))]">{item.density} density</span>
                      <span className={`font-semibold ${item.color}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
