"use client";
// ============================================================
// components/predictions/CrowdCard.tsx
// ------------------------------------------------------------
// One of the 3 station options: fetches a fresh crowd
// prediction from GET /api/predict/crowd?stationId=... on demand
// (only when the person expands this card, to avoid firing every
// prediction for every station just from opening the map panel).
// ============================================================

import { useState } from "react";
import { RISK_COLORS } from "@/lib/network";

export default function CrowdCard({ stationId }: { stationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setOpen(true);
    if (data) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/predict/crowd?stationId=${stationId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load prediction.");
      setData(json.prediction);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <button onClick={load} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium">🚶 Crowd Prediction</span>
        <span className="text-[rgb(var(--text-muted))]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-[rgb(var(--border))] px-4 py-3 text-sm">
          {loading && <p className="text-[rgb(var(--text-muted))]">Calculating...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {data && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: RISK_COLORS[data.level as keyof typeof RISK_COLORS] }}
                />
                <span className="font-semibold capitalize">{data.level} crowd level</span>
              </div>
              <p>Estimated {data.densityPercent}% of platform capacity ({data.estimatedCount} people).</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">
                {data.aiAssisted ? "Powered by the trained crowd-prediction model." : "Estimated using live sensor data (AI model not trained for this station yet)."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
