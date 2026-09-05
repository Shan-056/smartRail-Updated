"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CORRIDOR_COLORS, CORRIDOR_TO_LINE, type Corridor, type Line, type Station } from "@/lib/network";

// Lightweight icon cache to optimize rendering performance on older/mobile devices
const iconCache = new Map<string, L.DivIcon>();

function getStationIcon({
  station,
  color,
  isSelected,
  isHighlighted,
  isDimmed,
  showLabel,
  isOriginOrDest,
}: {
  station: Station;
  color: string;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  showLabel: boolean;
  isOriginOrDest: boolean;
}): L.DivIcon {
  const cacheKey = `${station.code}_${isSelected}_${isHighlighted}_${isDimmed}_${showLabel}_${isOriginOrDest}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const isInterchange = station.isInterchange;

  if (isDimmed) {
    // Ultra-lightweight dot for non-selected stations when a journey is active
    const icon = L.divIcon({
      className: "station-dimmed-wrapper",
      html: `<div style="width:5px; height:5px; border-radius:9999px; background:${color}; opacity:0.25; transform:translate(-50%,-50%);"></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    iconCache.set(cacheKey, icon);
    return icon;
  }

  const dotSize = isSelected ? 15 : isOriginOrDest ? 14 : isHighlighted ? 12 : isInterchange ? 10 : 7;
  const isWest = station.line === "Western";

  let labelHtml = "";
  if (showLabel) {
    let pillClass = "bg-white/95 text-slate-800 border-slate-200 dark:bg-zinc-900/95 dark:text-zinc-200 dark:border-zinc-700/80 shadow-xs";
    if (isSelected || isOriginOrDest) {
      pillClass = "bg-brand-600 text-white border-brand-700 shadow-md font-bold scale-105";
    } else if (isHighlighted) {
      pillClass = "bg-emerald-600 text-white border-emerald-700 font-semibold shadow-sm";
    } else if (isInterchange) {
      pillClass = "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 font-semibold";
    }

    labelHtml = `<span class="station-pill inline-block px-1.5 py-0.5 rounded text-[10px] tracking-tight border whitespace-nowrap pointer-events-none transition-all ${pillClass}">${station.name}</span>`;
  }

  const ringStyle = isSelected
    ? "box-shadow: 0 0 0 3px #2563eb, 0 4px 6px -1px rgba(0,0,0,0.3);"
    : isOriginOrDest
    ? "box-shadow: 0 0 0 2px #059669, 0 2px 4px rgba(0,0,0,0.2);"
    : isHighlighted
    ? "box-shadow: 0 0 0 2px #10b981;"
    : "box-shadow: 0 1px 2px rgba(0,0,0,0.2);";

  const containerHtml = isWest
    ? `<div class="station-anchor flex items-center justify-end" style="position:absolute; right:0; top:0; transform: translateY(-50%); white-space:nowrap; pointer-events:auto;">
        ${labelHtml ? `<div class="mr-1.5 inline-flex">${labelHtml}</div>` : ""}
        <div style="width:${dotSize}px; height:${dotSize}px; border-radius:9999px; border:1.5px solid #ffffff; background:${color}; flex-shrink:0; ${ringStyle}"></div>
      </div>`
    : `<div class="station-anchor flex items-center" style="position:absolute; left:0; top:0; transform: translateY(-50%); white-space:nowrap; pointer-events:auto;">
        <div style="width:${dotSize}px; height:${dotSize}px; border-radius:9999px; border:1.5px solid #ffffff; background:${color}; flex-shrink:0; ${ringStyle}"></div>
        ${labelHtml ? `<div class="ml-1.5 inline-flex">${labelHtml}</div>` : ""}
      </div>`;

  const icon = L.divIcon({
    className: "leaflet-station-wrapper",
    html: containerHtml,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

function MapController({
  selectedStation,
  highlightStations,
}: {
  selectedStation?: Station | null;
  highlightStations?: Station[];
}) {
  const map = useMap();
  const prevHighlightRef = useRef<number>(0);

  useEffect(() => {
    const currentCount = highlightStations?.length || 0;
    if (highlightStations && highlightStations.length > 1) {
      const bounds = L.latLngBounds(
        highlightStations.map((s) => [s.location.lat, s.location.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    } else if (selectedStation) {
      map.flyTo([selectedStation.location.lat, selectedStation.location.lng], 13, { duration: 0.8 });
    } else if (prevHighlightRef.current > 0 && currentCount === 0) {
      // Returned from active route to reset normal view
      map.flyTo([19.076, 72.877], 11, { duration: 0.8 });
    }
    prevHighlightRef.current = currentCount;
  }, [selectedStation, highlightStations, map]);

  return null;
}

export default function MapView({
  stations,
  activeLine = "all",
  activeCorridor = "all",
  selectedStation,
  highlightStations,
  onSelectStation,
}: {
  stations: Station[];
  activeLine?: Line | "all";
  activeCorridor?: Corridor | "all";
  selectedStation?: Station | null;
  highlightStations?: Station[];
  onSelectStation: (station: Station) => void;
}) {
  const [currentZoom, setCurrentZoom] = useState<number>(11);

  const hasActiveRoute = Boolean(highlightStations && highlightStations.length > 1);

  const visibleStations = useMemo(() => {
    return stations.filter((s) => {
      if (activeLine !== "all" && s.line !== activeLine) return false;
      if (activeCorridor !== "all" && s.corridor !== activeCorridor) return false;
      return true;
    });
  }, [stations, activeLine, activeCorridor]);

  const routeLines = useMemo(() => {
    const byCorridor = new Map<Corridor, Station[]>();
    for (const s of stations) {
      const list = byCorridor.get(s.corridor) ?? [];
      list.push(s);
      byCorridor.set(s.corridor, list);
    }
    return Array.from(byCorridor.entries()).map(([corridor, list]) => ({
      corridor,
      line: CORRIDOR_TO_LINE[corridor],
      positions: [...list].sort((a, b) => a.sequence - b.sequence).map((s) => [s.location.lat, s.location.lng] as [number, number]),
    }));
  }, [stations]);

  const highlightPositions = useMemo(() => {
    if (!highlightStations || highlightStations.length < 2) return null;
    return highlightStations.map((s) => [s.location.lat, s.location.lng] as [number, number]);
  }, [highlightStations]);

  const center: [number, number] = stations.length
    ? [stations.reduce((s, st) => s + st.location.lat, 0) / stations.length, stations.reduce((s, st) => s + st.location.lng, 0) / stations.length]
    : [19.076, 72.877];

  return (
    <div className="relative h-full w-full isolate z-0">
      <MapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomWatcher onZoomChange={setCurrentZoom} />
        <MapController selectedStation={selectedStation} highlightStations={highlightStations} />

        {/* Network track polylines:
            If a journey route is active, other corridors fade with significantly lower opacity (0.12)
            to make the selected route stand out cleanly */}
        {routeLines.map(({ corridor, line, positions }) => {
          const isLineActive =
            (activeLine === "all" || line === activeLine) &&
            (activeCorridor === "all" || corridor === activeCorridor);
          if (!isLineActive) return null;

          const polyOpacity = hasActiveRoute ? 0.12 : 0.65;
          const polyWeight = hasActiveRoute ? 2.5 : 4;

          return (
            <Polyline
              key={corridor}
              positions={positions}
              pathOptions={{
                color: CORRIDOR_COLORS[corridor] || "#3b82f6",
                weight: polyWeight,
                opacity: polyOpacity,
              }}
            />
          );
        })}

        {/* High-visibility active journey route: double layered for clean neon glow effect */}
        {highlightPositions && (
          <>
            {/* Outer halo */}
            <Polyline
              positions={highlightPositions}
              pathOptions={{ color: "#1d4ed8", weight: 8, opacity: 0.55 }}
            />
            {/* Inner core line */}
            <Polyline
              positions={highlightPositions}
              pathOptions={{ color: "#38bdf8", weight: 4, opacity: 1.0 }}
            />
          </>
        )}

        {visibleStations.map((station) => {
          const isSelected = selectedStation?._id === station._id || selectedStation?.code === station.code;
          const isStationOnRoute = highlightStations?.some((s) => s.code === station.code);
          const isOrigin = highlightStations && highlightStations.length > 0 && highlightStations[0]?.code === station.code;
          const isDestination = highlightStations && highlightStations.length > 1 && highlightStations[highlightStations.length - 1]?.code === station.code;
          const isOriginOrDest = Boolean(isOrigin || isDestination);

          // When a route is active:
          // Dim non-route stations down to faint dots with no label
          const isDimmed = hasActiveRoute && !isStationOnRoute && !isSelected;

          // Station label visibility rules:
          // 1. If zoomed out (<12) and no active route -> HIDE names to eliminate clutter
          // 2. If route is active -> SHOW names only for route stations (origin, destination, interchange, stops)
          // 3. If zoomed in (>=12) and no active route -> show names
          let showLabel = false;
          if (hasActiveRoute) {
            if (isOriginOrDest || isSelected) {
              showLabel = true;
            } else if (isStationOnRoute && currentZoom >= 11) {
              showLabel = true;
            }
          } else {
            // Zoomed out: hide labels completely unless selected
            if (isSelected) {
              showLabel = true;
            } else if (currentZoom >= 13) {
              showLabel = true;
            } else if (currentZoom >= 12 && station.isInterchange) {
              showLabel = true;
            }
          }

          return (
            <Marker
              key={station._id || station.code}
              position={[station.location.lat, station.location.lng]}
              icon={getStationIcon({
                station,
                color: isSelected ? "#2563eb" : isStationOnRoute ? "#059669" : CORRIDOR_COLORS[station.corridor] || "#3b82f6",
                isSelected,
                isHighlighted: !!isStationOnRoute,
                isDimmed,
                showLabel,
                isOriginOrDest,
              })}
              eventHandlers={{ click: () => onSelectStation(station) }}
            >
              <Popup>
                <div className="p-1 min-w-[160px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[rgb(var(--text))]">{station.name}</span>
                    <span className="rounded bg-brand-600/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-brand-600">
                      {station.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                    {station.line} Line &middot; {station.platformCount} Platforms
                  </p>

                  {station.isInterchange && (
                    <div className="mt-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Major Interchange Junction
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectStation(station)}
                    className="mt-2.5 w-full rounded-lg bg-brand-600 py-1.5 text-center text-xs font-semibold text-white hover:bg-brand-500 transition"
                  >
                    View Station Details &rarr;
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
