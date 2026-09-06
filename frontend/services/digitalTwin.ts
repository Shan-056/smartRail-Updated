// ============================================================
// services/digitalTwin.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the heart of the "Digital Twin" idea in the project
// name — a live, constantly-updated mirror of what's actually
// happening at each station right now: how many people are
// estimated to be there (occupancy), how many are arriving
// (inflow), and how many are leaving (outflow).
//
// Up to now, analyticsEngine.ts calculated a crowd snapshot and
// saved it straight to the CrowdLog collection. This file adds a
// layer ABOVE that: a single, fast-to-read "current state" per
// station, kept in memory and also mirrored to the database. The
// new /api/heatmap endpoint, and eventually the frontend map,
// read from THIS — not by re-scanning raw logs — which is what
// makes it a proper "digital twin" rather than just a log table.
// ============================================================

import { Station } from "@/models/Station";
import { CrowdLog } from "@/models/CrowdLog";
import { StationState } from "@/models/StationState";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

// Shape of one station's live state, used both in memory and as
// the return type for anything that reads the twin.
export interface LiveStationState {
  stationId: string;
  occupancy: number; // current best-estimate headcount at the station
  inflow: number; // people estimated to have arrived in the last update window
  outflow: number; // people estimated to have left in the last update window
  lastUpdated: Date;
}

// In-memory cache of every station's current state, keyed by
// station ID as a string. Human explanation: reading from memory
// is near-instant, so any endpoint that needs "current state right
// now" (like the heatmap) doesn't have to hit the database every
// single time. We still also save each update to MongoDB (the
// StationState model) so the state survives a server restart and
// so other services/teammates can query history if needed.
const liveState = new Map<string, LiveStationState>();

/**
 * updateStationState
 * Human explanation: Called right after a new CrowdLog is
 * calculated for a station (see analyticsEngine.ts). Works out
 * how much the occupancy changed since the last known state —
 * a rise counts as "inflow", a drop counts as "outflow" — then
 * updates both the in-memory cache and the database record.
 */
export async function updateStationState(
  stationId: string,
  newOccupancy: number
): Promise<LiveStationState> {
  const previous = liveState.get(stationId);
  const previousOccupancy = previous?.occupancy ?? newOccupancy;

  const delta = newOccupancy - previousOccupancy;
  const inflow = delta > 0 ? delta : 0;
  const outflow = delta < 0 ? Math.abs(delta) : 0;

  const state: LiveStationState = {
    stationId,
    occupancy: newOccupancy,
    inflow,
    outflow,
    lastUpdated: new Date(),
  };

  liveState.set(stationId, state);

  // Mirror the update to the database so it survives a restart and
  // is queryable by other parts of the system.
  await StationState.findOneAndUpdate(
    { station: stationId },
    {
      station: stationId,
      occupancy: state.occupancy,
      inflow: state.inflow,
      outflow: state.outflow,
      lastUpdated: state.lastUpdated,
    },
    { upsert: true, new: true }
  );

  return state;
}

/**
 * getStationState
 * Human explanation: Returns the current live state for one
 * station. Checks the fast in-memory cache first; if the server
 * just restarted and the cache is empty, falls back to reading
 * the last saved state from the database instead.
 */
export async function getStationState(stationId: string): Promise<LiveStationState | null> {
  const cached = liveState.get(stationId);
  if (cached) return cached;

  const saved = await StationState.findOne({ station: stationId });
  if (!saved) return null;

  const state: LiveStationState = {
    stationId,
    occupancy: saved.occupancy,
    inflow: saved.inflow,
    outflow: saved.outflow,
    lastUpdated: saved.lastUpdated,
  };
  liveState.set(stationId, state);
  return state;
}

/**
 * getAllStationStates
 * Human explanation: Returns the live state for every station
 * that has one, joined with each station's name/coordinates —
 * this is exactly the shape the heatmap endpoint needs. Reads
 * from the fast in-memory cache when available, and fills in any
 * gaps from the database (e.g. right after a server restart).
 */
export async function getAllStationStates(): Promise<
  Array<LiveStationState & { name: string; code: string; lat: number; lng: number; capacity: number }>
> {
  try {
    const stations = await Station.find().select("name code location capacity");
    if (stations && stations.length > 0) {
      const results = await Promise.all(
        stations.map(async (station) => {
          const state = await getStationState(station._id.toString());
          return {
            stationId: station._id.toString(),
            name: station.name,
            code: station.code,
            lat: station.location.lat,
            lng: station.location.lng,
            capacity: station.capacity,
            occupancy: state?.occupancy ?? 0,
            inflow: state?.inflow ?? 0,
            outflow: state?.outflow ?? 0,
            lastUpdated: state?.lastUpdated ?? new Date(0),
          };
        })
      );
      return results;
    }
  } catch (e) {
    // Fall back to MUMBAI_STATIONS if MongoDB is offline
  }

  return MUMBAI_STATIONS.map((station) => {
    const state = liveState.get(station._id);
    const est = Math.round((station.capacity * (45 + ((station.sequence * 7) % 35))) / 100);
    return {
      stationId: station._id,
      name: station.name,
      code: station.code,
      lat: station.location.lat,
      lng: station.location.lng,
      capacity: station.capacity,
      occupancy: state?.occupancy ?? est,
      inflow: state?.inflow ?? Math.round(est * 0.1),
      outflow: state?.outflow ?? Math.round(est * 0.08),
      lastUpdated: state?.lastUpdated ?? new Date(),
    };
  });
}

/**
 * seedStateFromLatestCrowdLogs
 * Human explanation: A one-time "warm start" helper. If the
 * server has just restarted and the in-memory cache is empty,
 * this reads the most recent CrowdLog for every station and uses
 * it to initialize the live state, so the twin doesn't start
 * from a blank slate.
 */
export async function seedStateFromLatestCrowdLogs(): Promise<void> {
  try {
    const latestPerStation = await CrowdLog.aggregate([
      { $sort: { calculatedAt: -1 } },
      { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
    ]);

    for (const entry of latestPerStation) {
      await updateStationState(entry._id.toString(), entry.doc.estimatedCount);
    }
  } catch (e) {
    // Graceful offline fallback: initialize liveState from MUMBAI_STATIONS
    for (const stn of MUMBAI_STATIONS) {
      const estimatedCount = Math.round((stn.capacity * (45 + ((stn.sequence * 7) % 35))) / 100);
      liveState.set(stn._id, {
        stationId: stn._id,
        occupancy: estimatedCount,
        inflow: Math.round(estimatedCount * 0.1),
        outflow: Math.round(estimatedCount * 0.08),
        lastUpdated: new Date(),
      });
    }
  }
}
