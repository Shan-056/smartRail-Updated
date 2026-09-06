"use client";

import { useState, useEffect } from "react";

export default function EtaCard({ stationId }: { stationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
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

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !data && !loading) {
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
          <span className="text-base">🚆</span>
          <span className="text-sm font-semibold text-[rgb(var(--text))]">Live Train ETA</span>
        </div>
        <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-[rgb(var(--text-muted))] bg-[rgb(var(--surface-2))]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="border-t border-[rgb(var(--border))] px-4 py-3 text-sm animate-in fade-in duration-150">
          {loading && <p className="text-xs text-[rgb(var(--text-muted))]">Fetching live positions...</p>}
          {error && <p className="text-xs text-rose-500">{error}</p>}
          {data && data.length === 0 && <p className="text-xs text-[rgb(var(--text-muted))]">No trains currently approaching this station.</p>}
          {data && data.length > 0 && (
            <ul className="space-y-2">
              {data.map((p: any, i: number) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold">{p.train}</span>{" "}
                    <span className="text-[11px] text-[rgb(var(--text-muted))]">({p.direction})</span>
                  </div>
                  <span className="font-bold text-brand-600 dark:text-brand-400">{p.etaMinutes} min</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
