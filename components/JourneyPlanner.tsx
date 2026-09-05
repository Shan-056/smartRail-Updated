"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Station } from "@/lib/network";
import { planJourney, JourneyPlan } from "@/lib/networkFallback";

interface JourneyPlannerProps {
  stations: Station[];
  initialFromCode?: string | null;
  onSelectRoute?: (stations: Station[]) => void;
  onSelectStation?: (station: Station) => void;
  onReset?: () => void;
}

type TabType = "directions" | "departures" | "coaches";

export default function JourneyPlanner({
  stations,
  initialFromCode,
  onSelectRoute,
  onSelectStation,
  onReset,
}: JourneyPlannerProps) {
  const [mounted, setMounted] = useState(false);
  const [fromCode, setFromCode] = useState<string>("MBC"); // Mumbai Central
  const [toCode, setToCode] = useState<string>("BY"); // Byculla
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("directions");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to open origin station panel
  const notifyOriginSelected = useCallback((code: string) => {
    if (!code) return;
    const stn = stations.find((s) => s.code === code);
    if (stn && onSelectStation) {
      onSelectStation(stn);
    }
  }, [stations, onSelectStation]);

  // Update origin station if user clicked "Plan trip from here" in StationPanel
  useEffect(() => {
    if (initialFromCode) {
      setFromCode(initialFromCode);
      setIsExpanded(true);
      setSelectedRouteIndex(0);
      notifyOriginSelected(initialFromCode);
    }
  }, [initialFromCode, notifyOriginSelected]);

  // Reset selected route index when origin or destination changes
  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [fromCode, toCode]);

  const popularRoutes = [
    { label: "GTB Nagar ⇄ Byculla (Multi-transfer)", from: "GTBN", to: "BY" },
    { label: "Mumbai Central ⇄ Byculla", from: "MBC", to: "BY" },
    { label: "Churchgate ⇄ Borivali", from: "CCG", to: "BVI" },
    { label: "CSMT ⇄ Thane", from: "CSMT", to: "THN" },
    { label: "Andheri ⇄ Kurla", from: "AND", to: "KUR" },
  ];

  const primaryPlan: JourneyPlan | null = useMemo(() => {
    if (!fromCode || !toCode || fromCode === toCode) return null;
    return planJourney(fromCode, toCode);
  }, [fromCode, toCode]);

  const activePlan: JourneyPlan | null = useMemo(() => {
    if (!primaryPlan) return null;
    if (primaryPlan.allRouteOptions && primaryPlan.allRouteOptions[selectedRouteIndex]) {
      return primaryPlan.allRouteOptions[selectedRouteIndex];
    }
    return primaryPlan;
  }, [primaryPlan, selectedRouteIndex]);

  // Automatically update highlighted route on map whenever active plan changes
  useEffect(() => {
    if (activePlan && onSelectRoute) {
      onSelectRoute(activePlan.intermediateStations);
    } else if ((!fromCode || !toCode) && onSelectRoute) {
      onSelectRoute([]);
    }
  }, [activePlan, fromCode, toCode, onSelectRoute]);

  const handleOriginChange = (code: string) => {
    setFromCode(code);
    notifyOriginSelected(code);
  };

  const handleSwap = () => {
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
    if (toCode) {
      notifyOriginSelected(toCode);
    }
  };

  const handleResetRoute = () => {
    setFromCode("");
    setToCode("");
    setSelectedRouteIndex(0);
    if (onSelectRoute) {
      onSelectRoute([]);
    }
    if (onReset) {
      onReset();
    }
  };

  // Group stations by line for clean optgroups
  const groupedStations = useMemo(() => {
    const groups: Record<string, Station[]> = {
      Western: [],
      Central: [],
      Harbour: [],
      "Trans-Harbour": [],
    };
    stations.forEach((s) => {
      if (groups[s.line]) {
        groups[s.line].push(s);
      }
    });
    return groups;
  }, [stations]);

  return (
    <div className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/95 backdrop-blur-md p-4 shadow-xl transition-all sm:p-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600/15 text-brand-600 font-bold dark:bg-brand-500/20 dark:text-brand-400">
            🚆
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight sm:text-base">Suburban Journey Planner</h2>
            <p className="text-[11px] text-[rgb(var(--text-muted))]">Live route logic, transfers & local fares</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(fromCode || toCode) && (
            <button
              onClick={handleResetRoute}
              title="Reset route and view normal map"
              className="flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-2xs"
            >
              <span>✕ Reset</span>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] transition"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 space-y-3.5">
          {/* Source & Destination selectors */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[rgb(var(--text-muted))]">Origin</label>
              <select
                value={fromCode}
                onChange={(e) => handleOriginChange(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-xs font-medium text-[rgb(var(--text))] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 sm:text-sm"
              >
                <option value="">Select origin station...</option>
                {Object.entries(groupedStations).map(([lineName, list]) => (
                  <optgroup key={lineName} label={`${lineName} Line`}>
                    {list.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex justify-center pt-1 sm:pt-4">
              <button
                type="button"
                onClick={handleSwap}
                title="Swap origin and destination"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-xs font-bold hover:bg-[rgb(var(--surface-2))] active:scale-95 transition shadow-sm"
              >
                ⇄
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[rgb(var(--text-muted))]">Destination</label>
              <select
                value={toCode}
                onChange={(e) => setToCode(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-xs font-medium text-[rgb(var(--text))] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 sm:text-sm"
              >
                <option value="">Select destination station...</option>
                {Object.entries(groupedStations).map(([lineName, list]) => (
                  <optgroup key={lineName} label={`${lineName} Line`}>
                    {list.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Route Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-[rgb(var(--text-muted))] scrollbar-none">
            <span className="shrink-0 text-[11px] font-semibold">Try:</span>
            {popularRoutes.map((r) => {
              const active = fromCode === r.from && toCode === r.to;
              return (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => {
                    handleOriginChange(r.from);
                    setToCode(r.to);
                  }}
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                    active
                      ? "border-brand-600 bg-brand-600 text-white font-semibold shadow-sm"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Empty state when reset */}
          {!activePlan && (
            <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-3.5 text-center bg-[rgb(var(--surface-2))]/50">
              <p className="text-xs font-medium text-[rgb(var(--text-muted))]">
                Select an origin and destination above, or tap any station on the map to explore.
              </p>
            </div>
          )}

          {/* RESULTS AREA */}
          {activePlan && (
            <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
              {/* ESSENTIALS: Always visible header */}
              <div className="border-b border-[rgb(var(--border))] pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-bold text-[rgb(var(--text))]">
                        {activePlan.fromStation.name} &rarr; {activePlan.toStation.name}
                      </span>
                      {activePlan.requiresTransfer ? (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          Transfer at {activePlan.transfer?.stationName}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          Direct ({activePlan.line} Line)
                        </span>
                      )}
                    </div>

                    {/* Authentic Mumbai Suburban Fare Display */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        ₹{activePlan.fareInr.secondClass} (II Class)
                      </span>
                      <span className="text-[rgb(var(--text-muted))]">&middot;</span>
                      <span className="text-[rgb(var(--text-muted))]">
                        ₹{activePlan.fareInr.firstClass} (I Class)
                      </span>
                      <span className="text-[rgb(var(--text-muted))]">&middot;</span>
                      <span className="text-[rgb(var(--text-muted))]">
                        ₹{activePlan.fareInr.acLocal} (AC Local)
                      </span>
                    </div>

                    <p className="mt-0.5 text-[11px] text-[rgb(var(--text-muted))]">
                      {activePlan.stopsCount} stops &middot; ~{activePlan.distanceKm} km
                    </p>
                  </div>

                  {/* Total duration */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[rgb(var(--text-muted))]">Duration</span>
                    <p className="text-base sm:text-lg font-extrabold text-brand-600 dark:text-brand-400">
                      ~{activePlan.totalDurationMin} min
                    </p>
                  </div>
                </div>

                {/* MULTI-ROUTE SELECTOR: When multiple transfer options exist (e.g. GTB Nagar to Byculla) */}
                {primaryPlan?.allRouteOptions && primaryPlan.allRouteOptions.length > 1 && (
                  <div className="mt-2.5 pt-2 border-t border-[rgb(var(--border))]/60">
                    <div className="mb-1 text-[11px] font-semibold text-[rgb(var(--text-muted))] flex items-center justify-between">
                      <span>Available Route Options:</span>
                      <span className="text-[10px] text-brand-600 dark:text-brand-400">
                        {primaryPlan.allRouteOptions.length} alternatives found
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {primaryPlan.allRouteOptions.map((opt, idx) => {
                        const isSelected = selectedRouteIndex === idx;
                        return (
                          <button
                            key={opt.id || idx}
                            type="button"
                            onClick={() => setSelectedRouteIndex(idx)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                              isSelected
                                ? "border-brand-600 bg-brand-600 text-white font-bold shadow-sm"
                                : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-2))]"
                            }`}
                          >
                            <span>{opt.routeName}</span>
                            <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[rgb(var(--text-muted))]"}`}>
                              (~{opt.totalDurationMin}m)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* TABS NAVIGATION */}
              <div className="flex border-b border-[rgb(var(--border))]">
                <button
                  type="button"
                  onClick={() => setActiveTab("directions")}
                  className={`flex-1 pb-2 text-center text-xs font-bold transition border-b-2 ${
                    activeTab === "directions"
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  🗺️ Step-by-Step
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("departures")}
                  className={`flex-1 pb-2 text-center text-xs font-bold transition border-b-2 ${
                    activeTab === "departures"
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  🕒 Next Trains
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("coaches")}
                  className={`flex-1 pb-2 text-center text-xs font-bold transition border-b-2 ${
                    activeTab === "coaches"
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  🚃 12-Car Density
                </button>
              </div>

              {/* TAB 1: STEP-BY-STEP DIRECTIONS */}
              {activeTab === "directions" && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  {/* Leg 1 */}
                  {activePlan.legs[0] && (
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                            1
                          </span>
                          <span className="text-xs font-bold text-[rgb(var(--text))]">
                            Board at {activePlan.legs[0].fromStation.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-[rgb(var(--text-muted))]">
                          ~{activePlan.legs[0].durationMin} min &middot; {activePlan.legs[0].stopsCount} stops
                        </span>
                      </div>

                      <p className="text-xs text-[rgb(var(--text))] leading-relaxed">
                        {activePlan.legs[0].instructions}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[rgb(var(--text-muted))]">
                        <span className="rounded bg-[rgb(var(--surface-2))] px-2 py-0.5 font-semibold">
                          Platform {activePlan.legs[0].platform}
                        </span>
                        <span suppressHydrationWarning className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Leaves {mounted ? activePlan.legs[0].departureTime : "--:--"} ({activePlan.legs[0].minutesAway} min)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Transfer Interchange Block */}
                  {activePlan.requiresTransfer && activePlan.transfer && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 dark:bg-amber-500/5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                            ⇄
                          </span>
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Switch Trains at {activePlan.transfer.stationName}
                          </span>
                        </div>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                          ~{activePlan.transfer.transferTimeMin} min walk
                        </span>
                      </div>

                      <p className="text-xs text-amber-950/90 dark:text-amber-200/90 leading-relaxed font-medium">
                        {activePlan.transfer.instructions}
                      </p>
                      <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                        Transfer from <strong>{activePlan.transfer.fromLine} Line</strong> to <strong>{activePlan.transfer.toLine} Line</strong>.
                      </p>
                    </div>
                  )}

                  {/* Leg 2 */}
                  {activePlan.requiresTransfer && activePlan.legs[1] && (
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                            2
                          </span>
                          <span className="text-xs font-bold text-[rgb(var(--text))]">
                            Connecting train at {activePlan.legs[1].fromStation.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-[rgb(var(--text-muted))]">
                          ~{activePlan.legs[1].durationMin} min &middot; {activePlan.legs[1].stopsCount} stops
                        </span>
                      </div>

                      <p className="text-xs text-[rgb(var(--text))] leading-relaxed">
                        {activePlan.legs[1].instructions}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[rgb(var(--text-muted))]">
                        <span className="rounded bg-[rgb(var(--surface-2))] px-2 py-0.5 font-semibold">
                          Platform {activePlan.legs[1].platform}
                        </span>
                        <span suppressHydrationWarning className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Depart {mounted ? activePlan.legs[1].departureTime : "--:--"}
                        </span>
                        <span className="text-[11px] text-[rgb(var(--text-muted))]">
                          Arrive at {activePlan.toStation.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: NEXT TRAINS */}
              {activeTab === "departures" && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="text-[11px] font-semibold text-[rgb(var(--text-muted))]">
                    Upcoming local trains from {activePlan.fromStation.name}:
                  </div>
                  {activePlan.nextDepartures.slice(0, 3).map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2.5"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[rgb(var(--text))]">{dep.destination}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              dep.type === "Fast"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : dep.type === "AC Fast"
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {dep.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-[rgb(var(--text-muted))]">
                          PF {dep.platform} &middot; {dep.trainNumber} &middot; {dep.status}
                        </p>
                      </div>

                      <div className="text-right">
                        <span suppressHydrationWarning className="text-xs font-bold text-brand-600 dark:text-brand-400">
                          {mounted ? dep.departureTime : "--:--"}
                        </span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          in {dep.minutesAway} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: 12-CAR COACH CROWD DENSITY */}
              {activeTab === "coaches" && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] text-[rgb(var(--text-muted))]">
                    <span className="font-semibold">12-Car Rake Occupancy</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Green = Board here</span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {activePlan.nextDepartures[0]?.coaches.map((c, idx) => {
                      const colorClass =
                        c >= 80
                          ? "bg-rose-500 text-white"
                          : c >= 55
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-500 text-white";
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col items-center justify-center rounded-lg p-1.5 text-center shadow-xs transition ${colorClass}`}
                        >
                          <span className="text-[9px] font-bold opacity-90">C{idx + 1}</span>
                          <span className="text-[10px] font-extrabold">{c}%</span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-2.5 rounded-xl border border-[rgb(var(--border))] leading-relaxed">
                    💡 {activePlan.coachRecommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
