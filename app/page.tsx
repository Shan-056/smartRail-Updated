"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import CorridorFilter from "@/components/CorridorFilter";
import StationPanel from "@/components/StationPanel";
import JourneyPlanner from "@/components/JourneyPlanner";
import ControlRoomModal from "@/components/ControlRoomModal";
import type { Corridor, Station } from "@/lib/network";
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
  const [corridor, setCorridor] = useState<Corridor | "all">("all");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [highlightStations, setHighlightStations] = useState<Station[]>([]);
  const [showControlRoom, setShowControlRoom] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

      {/* Corridor Filter bar & Station Search */}
      <div className="flex flex-wrap items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2 sm:px-6 gap-2">
        <CorridorFilter active={corridor} onChange={setCorridor} />

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search station (e.g. Dadar, Andheri)..."
            className="w-48 sm:w-64 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3.5 py-1.5 text-xs text-[rgb(var(--text))] placeholder-[rgb(var(--text-muted))] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
          {searchQuery && (
            <div className="absolute left-0 top-full mt-1 z-[1100] max-h-48 w-full overflow-y-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-lg p-1 text-xs">
              {filteredStations.slice(0, 5).map((stn) => (
                <button
                  key={stn.code}
                  onClick={() => {
                    setSelectedStation(stn);
                    setSearchQuery("");
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[rgb(var(--surface-2))] flex items-center justify-between"
                >
                  <span className="font-semibold">{stn.name}</span>
                  <span className="text-[10px] text-[rgb(var(--text-muted))]">{stn.code}</span>
                </button>
              ))}
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
            activeCorridor={corridor}
            selectedStation={selectedStation}
            highlightStations={highlightStations}
            onSelectStation={(stn) => setSelectedStation(stn)}
          />
        </div>

        {/* Floating Journey Planner on top-left (Responsive, non-blocking) */}
        <div className="absolute top-3 left-3 z-[1000] w-[calc(100%-1.5rem)] sm:w-[420px] max-h-[calc(100%-1.5rem)] overflow-y-auto pointer-events-auto">
          <JourneyPlanner
            stations={stations}
            onSelectRoute={(intermediate) => {
              setHighlightStations(intermediate);
            }}
            onSelectStation={(stn) => setSelectedStation(stn)}
          />
        </div>

        {/* Station Detail Panel on the right (Clean z-[1050] layer above map) */}
        {selectedStation && (
          <StationPanel
            station={selectedStation}
            onClose={() => setSelectedStation(null)}
            onPlanTripFromStation={(stn) => {
              // Can set as source
              setSelectedStation(null);
            }}
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
