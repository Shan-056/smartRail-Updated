"use client";

import { useState, useEffect } from "react";
import { RISK_COLORS } from "@/lib/network";

export default function CongestionCard({ stationId }: { stationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [congestion, setCongestion] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCongestion(null);
    setOccupancy(null);
    setError(null);
    if (open) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  async function loadData() {
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

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !congestion && !loading) {
      loadData();
    }
  };

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[rgb(var(--surface-2))]/50 transition cursor-pointer select-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span className="text-sm font-semibold text-[rgb(var(--text))]">Congestion & Train Occupancy</span>
        </div>
        <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-[rgb(var(--text-muted))] bg-[rgb(var(--surface-2))]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="border-t border-[rgb(var(--border))] px-4 py-3.5 text-xs animate-in fade-in duration-150 space-y-3">
          {loading && <p className="text-[rgb(var(--text-muted))]">Calculating dynamic bottlenecks...</p>}
          {error && <p className="text-rose-500">{error}</p>}
          {congestion && (
            <div className="rounded-lg bg-[rgb(var(--surface-2))]/50 p-2.5 space-y-1.5 border border-[rgb(var(--border))]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: RISK_COLORS[congestion.risk as keyof typeof RISK_COLORS] || RISK_COLORS.moderate }}
                  />
                  <span className="font-bold capitalize text-[rgb(var(--text))]">{congestion.risk} congestion risk</span>
                </div>
                <span className="text-[11px] font-semibold text-[rgb(var(--text-muted))]">
                  {Math.round((congestion.riskProbability ?? 0.5) * 100)}% probability
                </span>
              </div>
              {congestion.advisory && (
                <p className="text-[11px] text-[rgb(var(--text-muted))] leading-relaxed">
                  {congestion.advisory}
                </p>
              )}
            </div>
          )}
          {occupancy && occupancy.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                Approaching Rake Capacity
              </span>
              <ul className="space-y-1.5">
                {occupancy.map((o: any, i: number) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-[rgb(var(--surface-2))]/30 p-2 text-xs">
                    <span className="font-medium text-[rgb(var(--text))]">{o.trainId || `Train #${o.trainNumber || i + 1}`}</span>
                    <span className={o.predictedOccupancy > 0.85 ? "font-bold text-rose-600 dark:text-rose-400" : "font-semibold text-emerald-600 dark:text-emerald-400"}>
                      {Math.round(o.predictedOccupancy * 100)}% full
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
