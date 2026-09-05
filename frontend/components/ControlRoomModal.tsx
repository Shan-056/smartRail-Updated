"use client";

import { useState, useEffect, useCallback } from "react";
import { Station } from "@/lib/network";

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

export default function ControlRoomModal({ stations, onClose }: ControlRoomModalProps) {
  const [activeTab, setActiveTab] = useState<"advisory" | "telemetry" | "cctv">("advisory");
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");

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

  useEffect(() => {
    loadAdvisory();
  }, [selectedStationId, loadAdvisory]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
      <div
        className="flex h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Operations Control Room (OCC)</h2>
              <p className="text-xs text-[rgb(var(--text-muted))]">Mumbai Suburban Digital Twin & AI Advisory</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-[rgb(var(--border))] p-0.5 text-xs">
              <button
                onClick={() => setActiveTab("advisory")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  activeTab === "advisory" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))]"
                }`}
              >
                AI Advisory
              </button>
              <button
                onClick={() => setActiveTab("telemetry")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  activeTab === "telemetry" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))]"
                }`}
              >
                Digital Twin
              </button>
              <button
                onClick={() => setActiveTab("cctv")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  activeTab === "cctv" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))]"
                }`}
              >
                CCTV Anomaly
              </button>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
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
