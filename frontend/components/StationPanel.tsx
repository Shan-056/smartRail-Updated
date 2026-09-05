"use client";

import { useState } from "react";
import { CORRIDOR_LABELS, type Station } from "@/lib/network";
import CrowdCard from "./predictions/CrowdCard";
import EtaCard from "./predictions/EtaCard";
import CongestionCard from "./predictions/CongestionCard";
import StationMapModal from "./StationMapModal";
import { getStationDepartures } from "@/lib/networkFallback";

export default function StationPanel({
  station,
  onClose,
  onPlanTripFromStation,
}: {
  station: Station;
  onClose: () => void;
  onPlanTripFromStation?: (station: Station) => void;
}) {
  const [showStationMap, setShowStationMap] = useState(false);
  const departures = getStationDepartures(station);

  return (
    <>
      {/* Mobile backdrop so map cannot bleed or receive misclicks */}
      <div
        className="fixed inset-0 z-[1040] bg-black/40 backdrop-blur-[2px] transition-opacity sm:hidden"
        onClick={onClose}
      />

      {/* Main panel - elevated above Leaflet z-index */}
      <div className="fixed inset-x-2 bottom-2 top-auto z-[1050] max-h-[85vh] sm:max-h-none sm:top-2 sm:bottom-2 sm:right-2 sm:left-auto flex w-auto sm:w-full sm:max-w-md flex-col rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-right-6 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">{station.name}</h2>
              <span className="rounded bg-brand-600/15 px-2 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                {station.code}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">
              {station.line} Line &middot; {station.platformCount} Platforms &middot; Cap: {station.capacity.toLocaleString()} pax
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-[rgb(var(--surface-2))] px-2.5 py-0.5 text-[11px] font-medium text-[rgb(var(--text-muted))]">
                {CORRIDOR_LABELS[station.corridor]}
              </span>
              {onPlanTripFromStation && (
                <button
                  type="button"
                  onClick={() => onPlanTripFromStation(station)}
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Plan trip from here &rarr;
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-base text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Live Departures Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                Next Departing Trains
              </h3>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Live Feed</span>
            </div>
            <div className="space-y-2">
              {departures.slice(0, 3).map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{dep.destination}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          dep.type === "Fast"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : dep.type === "AC Fast"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {dep.type}
                      </span>
                      <span className="rounded bg-[rgb(var(--surface))] px-1.5 py-0.2 text-[9px] font-medium">
                        PF {dep.platform}
                      </span>
                    </div>
                    <p suppressHydrationWarning className="mt-0.5 text-[11px] text-[rgb(var(--text-muted))]">
                      Leaves in <strong className="text-[rgb(var(--text))]">{dep.minutesAway} mins</strong> ({dep.departureTime}) &middot; {dep.status}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        dep.crowdLevel === "low"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : dep.crowdLevel === "moderate"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {dep.crowdLevel}
                    </span>
                    <p className="text-[10px] text-[rgb(var(--text-muted))]">{dep.crowdPercent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Predictions Dropdown Cards */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
              Sensor & ML Predictions
            </h3>
            <CrowdCard stationId={station._id} />
            <EtaCard stationId={station._id} />
            <CongestionCard stationId={station._id} />
          </div>
        </div>

        {/* Footer with 2D/3D map */}
        <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-3.5">
          <button
            onClick={() => setShowStationMap(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-700 active:scale-[0.99] transition shadow-sm"
          >
            🗺️ Open 2D / 3D Platform Heatmap
          </button>
        </div>
      </div>

      {showStationMap && (
        <StationMapModal
          stationId={station._id}
          stationName={station.name}
          onClose={() => setShowStationMap(false)}
        />
      )}
    </>
  );
}
