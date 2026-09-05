"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CORRIDOR_COLORS, type Corridor, type Station } from "@/lib/network";

function markerIcon(color: string, size = 14, isSelected = false) {
  return L.divIcon({
    className: "",
    html: `<div class="station-marker ${isSelected ? "ring-4 ring-brand-500 scale-125" : ""}" style="width:${size}px;height:${size}px;background:${color};transition:all 0.2s"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapController({
  selectedStation,
  highlightStations,
}: {
  selectedStation?: Station | null;
  highlightStations?: Station[];
}) {
  const map = useMap();

  useEffect(() => {
    if (highlightStations && highlightStations.length > 1) {
      const bounds = L.latLngBounds(
        highlightStations.map((s) => [s.location.lat, s.location.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (selectedStation) {
      map.flyTo([selectedStation.location.lat, selectedStation.location.lng], 13, { duration: 0.8 });
    }
  }, [selectedStation, highlightStations, map]);

  return null;
}

export default function MapView({
  stations,
  activeCorridor,
  selectedStation,
  highlightStations,
  onSelectStation,
}: {
  stations: Station[];
  activeCorridor: Corridor | "all";
  selectedStation?: Station | null;
  highlightStations?: Station[];
  onSelectStation: (station: Station) => void;
}) {
  const visibleStations = useMemo(
    () => (activeCorridor === "all" ? stations : stations.filter((s) => s.corridor === activeCorridor)),
    [stations, activeCorridor]
  );

  const routeLines = useMemo(() => {
    const byCorridor = new Map<Corridor, Station[]>();
    for (const s of stations) {
      const list = byCorridor.get(s.corridor) ?? [];
      list.push(s);
      byCorridor.set(s.corridor, list);
    }
    return Array.from(byCorridor.entries()).map(([corridor, list]) => ({
      corridor,
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
      <MapContainer center={center} zoom={10} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selectedStation={selectedStation} highlightStations={highlightStations} />

        {routeLines.map(({ corridor, positions }) =>
          activeCorridor === "all" || activeCorridor === corridor ? (
            <Polyline
              key={corridor}
              positions={positions}
              pathOptions={{ color: CORRIDOR_COLORS[corridor], weight: 3.5, opacity: 0.6 }}
            />
          ) : null
        )}

        {/* Highlighted journey path */}
        {highlightPositions && (
          <Polyline
            positions={highlightPositions}
            pathOptions={{ color: "#2563eb", weight: 6, opacity: 0.95, dashArray: "1, 10" }}
          />
        )}

        {visibleStations.map((station) => {
          const isSelected = selectedStation?._id === station._id;
          const isHighlighted = highlightStations?.some((s) => s._id === station._id);

          return (
            <Marker
              key={station._id}
              position={[station.location.lat, station.location.lng]}
              icon={markerIcon(
                isSelected ? "#2563eb" : isHighlighted ? "#059669" : CORRIDOR_COLORS[station.corridor],
                isSelected ? 18 : isHighlighted ? 15 : 13,
                isSelected
              )}
              eventHandlers={{ click: () => onSelectStation(station) }}
            >
              <Popup>
                <div className="text-sm font-semibold">{station.name}</div>
                <div className="text-xs text-gray-500">
                  {station.code} &middot; {station.line} Line
                </div>
                <div className="mt-1 text-[11px] text-blue-600 font-medium">Click to view live arrivals</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
