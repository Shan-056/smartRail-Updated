"use client";

import { useState, useMemo } from "react";
import { Station } from "@/lib/network";
import { planJourney, JourneyPlan } from "@/lib/networkFallback";

interface JourneyPlannerProps {
  stations: Station[];
  onSelectRoute?: (stations: Station[]) => void;
  onSelectStation?: (station: Station) => void;
}

export default function JourneyPlanner({
  stations,
  onSelectRoute,
  onSelectStation,
}: JourneyPlannerProps) {
  const [fromCode, setFromCode] = useState<string>("CCG");
  const [toCode, setToCode] = useState<string>("BVI");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Quick suggestions
  const popularStationCodes = ["CCG", "DDR-W", "BND", "AND", "BVI", "VR", "CSMT", "THN", "KYN"];

  const journeyPlan: JourneyPlan | null = useMemo(() => {
    if (!fromCode || !toCode || fromCode === toCode) return null;
    return planJourney(fromCode, toCode);
  }, [fromCode, toCode]);

  const handleSwap = () => {
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
  };

  const handleShowOnMap = () => {
    if (journeyPlan && onSelectRoute) {
      onSelectRoute(journeyPlan.intermediateStations);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm transition-all sm:p-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 font-bold dark:bg-brand-500/20 dark:text-brand-400">
            🚆
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight sm:text-base">Plan Your Journey</h2>
            <p className="text-xs text-[rgb(var(--text-muted))]">Simple, live train times & coach crowd guidance</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] transition"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Source & Destination selectors */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgb(var(--text-muted))]">From Station</label>
              <select
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3.5 py-2.5 text-sm font-medium focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                {stations.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code}) &middot; {s.line}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center pt-1 sm:pt-4">
              <button
                type="button"
                onClick={handleSwap}
                title="Swap source and destination"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-base hover:bg-[rgb(var(--surface-2))] active:scale-95 transition"
              >
                ⇄
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[rgb(var(--text-muted))]">To Station</label>
              <select
                value={toCode}
                onChange={(e) => setToCode(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3.5 py-2.5 text-sm font-medium focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                {stations.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code}) &middot; {s.line}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Popular fast chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-[rgb(var(--text-muted))]">
            <span className="shrink-0 font-medium">Quick:</span>
            {popularStationCodes.map((code) => {
              const stn = stations.find((s) => s.code === code);
              if (!stn) return null;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    if (fromCode === code) return;
                    setToCode(code);
                  }}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition ${
                    toCode === code
                      ? "border-brand-600 bg-brand-600/10 font-semibold text-brand-600 dark:text-brand-400"
                      : "border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))]"
                  }`}
                >
                  {stn.name}
                </button>
              );
            })}
          </div>

          {/* Results Card */}
          {journeyPlan && (
            <div className="space-y-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
              {/* Summary header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[rgb(var(--text))]">
                      {journeyPlan.fromStation.name} &rarr; {journeyPlan.toStation.name}
                    </span>
                    <span className="rounded-md bg-brand-600/15 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {journeyPlan.line} Line
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">
                    {journeyPlan.stopsCount} stops &middot; ~{journeyPlan.distanceKm} km &middot; ₹{journeyPlan.fareInr.secondClass} (II Class)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Fast Local</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {journeyPlan.durationFastMin} min
                    </p>
                  </div>
                  <div className="h-8 w-px bg-[rgb(var(--border))]" />
                  <div className="text-right">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Slow Local</span>
                    <p className="text-base font-semibold text-[rgb(var(--text))]">
                      {journeyPlan.durationSlowMin} min
                    </p>
                  </div>
                </div>
              </div>

              {/* Next upcoming departures */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  Next Trains Leaving {journeyPlan.fromStation.name}
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {journeyPlan.nextDepartures.slice(0, 2).map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{dep.departureTime}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              dep.type === "Fast"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : dep.type === "AC Fast"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {dep.type}
                          </span>
                          <span className="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium">
                            PF {dep.platform}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                          Departs in <strong className="text-[rgb(var(--text))]">{dep.minutesAway} mins</strong> &middot; {dep.status}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                            dep.crowdLevel === "low"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : dep.crowdLevel === "moderate"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {dep.crowdLevel} crowd
                        </span>
                        <p className="mt-0.5 text-[10px] text-[rgb(var(--text-muted))]">{dep.crowdPercent}% full</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coach Crowding Guide (12 cars) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[rgb(var(--text-muted))]">
                    Platform Coach Boarding Guide (12-Car Rake)
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Green = More room to sit/stand
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2">
                  {journeyPlan.nextDepartures[0]?.coaches.map((cPercent, idx) => {
                    const isLow = cPercent < 55;
                    const isMod = cPercent >= 55 && cPercent < 75;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className={`h-6 w-full rounded transition-all ${
                            isLow
                              ? "bg-emerald-500"
                              : isMod
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          title={`Coach ${idx + 1}: ${cPercent}% occupancy`}
                        />
                        <span className="mt-1 text-[9px] text-[rgb(var(--text-muted))]">C{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-[rgb(var(--text-muted))]">
                  💡 {journeyPlan.coachRecommendation}
                </p>
              </div>

              {/* Map Highlight Action */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleShowOnMap}
                  className="flex items-center gap-1.5 rounded-xl border border-brand-600 bg-brand-600/10 px-3.5 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-600/20 active:scale-95 transition dark:text-brand-400"
                >
                  📍 Highlight Stops & Route on Map
                </button>

                {onSelectStation && (
                  <button
                    type="button"
                    onClick={() => onSelectStation(journeyPlan.fromStation)}
                    className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 py-2 text-xs font-medium hover:bg-[rgb(var(--surface-2))] transition"
                  >
                    View {journeyPlan.fromStation.name} Live Platforms &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
