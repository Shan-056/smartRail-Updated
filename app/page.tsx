"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import CorridorFilter from "@/components/CorridorFilter";
import StationPanel from "@/components/StationPanel";
import JourneyPlanner from "@/components/JourneyPlanner";
import ControlRoomModal from "@/components/ControlRoomModal";
import type { Corridor, Line, Station } from "@/lib/network";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-[rgb(var(--text-muted))]">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <span>Loading suburban network map...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [stations, setStations] = useState<Station[]>(MUMBAI_STATIONS);
  const [loading, setLoading] = useState(true);
  const [activeLine, setActiveLine] = useState<Line | "all">("all");
  const [corridor, setCorridor] = useState<Corridor | "all">("all");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [highlightStations, setHighlightStations] = useState<Station[]>([]);
  const [showControlRoom, setShowControlRoom] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [planOriginCode, setPlanOriginCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stations");
        if (res.ok) {
          const data = await res.json();
          if (data.stations && data.stations.length > 0) {
            setStations(data.stations);
          }
        }
      } catch (e) {
        console.warn("Using offline fallback stations:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelectStation = useCallback((stn: Station | null) => {
    setSelectedStation(stn);
  }, []);

  const handleCloseStationPanel = useCallback(() => {
    setSelectedStation(null);
    setPlanOriginCode(null);
  }, []);

  const handleResetPlanner = useCallback(() => {
    setHighlightStations([]);
    setSelectedStation(null);
    setPlanOriginCode(null);
  }, []);

  const handlePlanTripFromStation = useCallback((stn: Station) => {
    setPlanOriginCode(stn.code);
    setSelectedStation(null);
  }, []);

  const filteredStations = stations.filter((s) => {
    if (!searchQuery) return true;
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      <Navbar onOpenControlRoom={() => setShowControlRoom(true)} />

      {/* Railway Line Selection & Station Search Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2 sm:px-6 gap-2">
        <CorridorFilter
          activeLine={activeLine}
          activeCorridor={corridor}
          onLineChange={setActiveLine}
          onCorridorChange={setCorridor}
        />

        {/* Station Search Input with light colored border for clear visibility */}
        <div className="relative w-full sm:w-auto min-w-[220px] sm:min-w-[280px]">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station (e.g. Dadar, Andheri)..."
              className="w-full rounded-full border border-slate-300 dark:border-zinc-600 bg-[rgb(var(--surface-2))] pl-9 pr-8 py-1.5 text-xs text-[rgb(var(--text))] placeholder-[rgb(var(--text-muted))] shadow-2xs hover:border-slate-400 dark:hover:border-zinc-500 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="absolute right-0 top-full mt-1.5 z-[1100] max-h-56 w-full min-w-[260px] overflow-y-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-xl p-1 text-xs backdrop-blur-md">
              {filteredStations.length === 0 ? (
                <div className="px-3 py-2 text-center text-xs text-[rgb(var(--text-muted))]">
                  No station found
                </div>
              ) : (
                filteredStations.slice(0, 6).map((stn) => (
                  <button
                    key={stn.code}
                    onClick={() => {
                      handleSelectStation(stn);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[rgb(var(--surface-2))] flex items-center justify-between transition"
                  >
                    <div>
                      <span className="font-semibold text-[rgb(var(--text))]">{stn.name}</span>
                      <span className="ml-1.5 text-[10px] text-[rgb(var(--text-muted))]">{stn.line}</span>
                    </div>
                    <span className="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                      {stn.code}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main interactive stage */}
      <main className="relative flex-1 overflow-hidden">
        {/* Full-width Map Container */}
        <div className="absolute inset-0 z-0">
          <MapView
            stations={stations}
            activeLine={activeLine}
            activeCorridor={corridor}
            selectedStation={selectedStation}
            highlightStations={highlightStations}
            onSelectStation={handleSelectStation}
          />
        </div>

        {/* Floating Journey Planner on top-left (Responsive, non-blocking) */}
        <div className="absolute top-3 left-3 z-[1000] w-[calc(100%-1.5rem)] sm:w-[420px] max-h-[calc(100%-1.5rem)] flex flex-col pointer-events-auto">
          <JourneyPlanner
            stations={stations}
            initialFromCode={planOriginCode}
            onSelectRoute={(intermediate) => {
              setHighlightStations(intermediate);
            }}
            onSelectStation={handleSelectStation}
            onReset={handleResetPlanner}
          />
        </div>

        {/* Station Detail Panel on the right (Aligns starting height with Journey Planner at top-3) */}
        {selectedStation && (
          <StationPanel
            station={selectedStation}
            onClose={handleCloseStationPanel}
            onPlanTripFromStation={handlePlanTripFromStation}
          />
        )}
      </main>

      {/* Control Room Modal */}
      {showControlRoom && (
        <ControlRoomModal stations={stations} onClose={() => setShowControlRoom(false)} />
      )}
    </div>
  );
}
