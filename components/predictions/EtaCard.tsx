"use client";

import { useState } from "react";

export default function EtaCard({ stationId }: { stationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setOpen(true);
    if (data) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/predict/eta?stationId=${stationId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load ETAs.");
      setData(json.predictions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <button onClick={load} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium">🚆 Live Train ETA</span>
        <span className="text-[rgb(var(--text-muted))]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-[rgb(var(--border))] px-4 py-3 text-sm">
          {loading && <p className="text-[rgb(var(--text-muted))]">Fetching live positions...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {data && data.length === 0 && <p className="text-[rgb(var(--text-muted))]">No trains currently approaching this station.</p>}
          {data && data.length > 0 && (
            <ul className="space-y-2">
              {data.map((p: any, i: number) => (
                <li key={i} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{p.train}</span>{" "}
                    <span className="text-xs text-[rgb(var(--text-muted))]">({p.direction})</span>
                  </div>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">{p.etaMinutes} min</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
