"use client";
// ============================================================
// components/predictions/CongestionCard.tsx
// ------------------------------------------------------------
// One of the 3 station options: combines station-level congestion
// risk (GET /api/predict/congestion) with per-train occupancy
// forecasts for trains approaching this station
// (GET /api/predict/occupancy) into one card.
// ============================================================

import { useState } from "react";
import { RISK_COLORS } from "@/lib/network";

export default function CongestionCard({ stationId }: { stationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [congestion, setCongestion] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setOpen(true);
    if (congestion) return;
    setLoading(true);
    setError(null);
    try {
      const [congestionRes, occupancyRes] = await Promise.all([
        fetch(`/api/predict/congestion?stationId=${stationId}`, { credentials: "include" }),
        fetch(`/api/predict/occupancy?stationId=${stationId}`, { credentials: "include" }),
      ]);
      const congestionJson = await congestionRes.json();
      const occupancyJson = await occupancyRes.json();
      if (!congestionRes.ok) throw new Error(congestionJson.message || "Failed to load congestion risk.");
      setCongestion(congestionJson.prediction);
      setOccupancy(occupancyJson.predictions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <button onClick={load} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium">⚠️ Congestion & Train Occupancy</span>
        <span className="text-[rgb(var(--text-muted))]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-[rgb(var(--border))] px-4 py-3 text-sm">
          {loading && <p className="text-[rgb(var(--text-muted))]">Calculating...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {congestion && (
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLORS[congestion.risk as keyof typeof RISK_COLORS] }} />
              <span className="font-semibold capitalize">{congestion.risk} congestion risk</span>
              <span className="text-xs text-[rgb(var(--text-muted))]">({Math.round(congestion.riskProbability * 100)}% probability)</span>
            </div>
          )}
          {occupancy && occupancy.length > 0 && (
            <ul className="space-y-1.5">
              {occupancy.map((o: any, i: number) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{o.trainId}</span>
                  <span className={o.predictedOccupancy > 1 ? "font-semibold text-red-500" : "text-[rgb(var(--text-muted))]"}>
                    {Math.round(o.predictedOccupancy * 100)}% full
                  </span>
                </li>
              ))}
            </ul>
          )}
          {occupancy && occupancy.length === 0 && !loading && (
            <p className="text-xs text-[rgb(var(--text-muted))]">No trains currently approaching to forecast occupancy for.</p>
          )}
        </div>
      )}
    </div>
  );
}
