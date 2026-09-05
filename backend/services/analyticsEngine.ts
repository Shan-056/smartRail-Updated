// ============================================================
// services/analyticsEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the "brain" that turns raw, messy data (CCTV counts,
// ticket sales, GPS pings) into the clean numbers the frontend
// displays: crowd density per station, and ETA per train.
//
// For each calculation, it FIRST tries asking the AI engine
// (services/aiEngine.ts) for a smarter prediction. If the AI
// engine isn't available (not running, times out, or the station
// falls outside its trained coverage — see lib/aiStationMap.ts),
// it automatically falls back to a solid, transparent math-based
// estimate — so the backend stays fully functional on its own.
//
// FIX (integration bug): the AI engine expects short recent-history
// TIME SERIES (crowd density / entry / exit / ticket-activity over
// the last several 5-minute windows), not a single running total.
// The previous version only ever sent one lump sum, which the real
// AI engine's contract has no field for. This version builds those
// series from the actual logged history.
// ============================================================

import { CctvEvent } from "@/models/CctvEvent";
import { AtvmLog } from "@/models/AtvmLog";
import { UtsLog } from "@/models/UtsLog";
import { GpsLog } from "@/models/GpsLog";
import { CrowdLog, type ICrowdLog } from "@/models/CrowdLog";
import { EtaLog, type IEtaLog } from "@/models/EtaLog";
import { Station, type IStation } from "@/models/Station";
import { Train } from "@/models/Train";
import { getAiCrowdPrediction, getAiEtaPrediction } from "./aiEngine";
import { mapAiRiskToCrowdLevel } from "@/lib/aiStationMap";
import { updateStationState } from "./digitalTwin";

// Only look at data from the last N minutes when calculating "right
// now" stats. Older readings are considered stale and ignored.
const RECENT_WINDOW_MINUTES = 5;

// How many 5-minute buckets of history to hand the AI engine as its
// "recent_*" time series. The AI engine's feature pipeline was
// trained on up-to-12 lagged 5-minute steps (1 hour of history).
const HISTORY_BUCKETS = 12;
const BUCKET_MINUTES = 5;

/**
 * bucketCountsByTime
 * Human explanation: Splits a list of timestamped events into
 * fixed-size time buckets (e.g. "5 minutes each") counting back
 * from now, and sums a numeric field within each bucket. Returns
 * the buckets oldest-first, which is the "most-recent-last" order
 * the AI engine's models expect.
 */
function bucketCountsByTime<T>(
  events: T[],
  getTime: (e: T) => Date,
  getValue: (e: T) => number,
  bucketCount: number,
  bucketMinutes: number
): number[] {
  const now = Date.now();
  const buckets = new Array(bucketCount).fill(0);

  for (const event of events) {
    const ageMs = now - getTime(event).getTime();
    const bucketIndexFromNow = Math.floor(ageMs / (bucketMinutes * 60 * 1000));
    if (bucketIndexFromNow >= 0 && bucketIndexFromNow < bucketCount) {
      // Index 0 = most recent bucket; flip so oldest is first.
      const idx = bucketCount - 1 - bucketIndexFromNow;
      buckets[idx] += getValue(event);
    }
  }

  return buckets;
}

/**
 * recalculateCrowdForStation
 * Human explanation: For one station, gathers recent CCTV
 * headcounts and ticket sales (as both a lump sum for the
 * fallback math, and as a bucketed time series for the AI
 * engine), tries the AI engine first, and falls back to a
 * transparent estimate if it's unavailable or this station isn't
 * one it was trained on. Either way, saves the result as a new
 * CrowdLog entry and returns it.
 */
export async function recalculateCrowdForStation(stationId: string): Promise<ICrowdLog | null> {
  const historyWindowStart = new Date(Date.now() - HISTORY_BUCKETS * BUCKET_MINUTES * 60 * 1000);
  const since = new Date(Date.now() - RECENT_WINDOW_MINUTES * 60 * 1000);

  const station = await Station.findById(stationId);
  if (!station) return null;

  // Pull enough history for both the fallback lump-sum and the AI
  // engine's bucketed time series in one query per collection.
  const [cctvHistory, atvmHistory, utsHistory, crowdHistory] = await Promise.all([
    CctvEvent.find({ station: stationId, capturedAt: { $gte: historyWindowStart } }),
    AtvmLog.find({ station: stationId, transactionAt: { $gte: historyWindowStart } }),
    UtsLog.find({ station: stationId, transactionAt: { $gte: historyWindowStart } }),
    CrowdLog.find({ station: stationId, calculatedAt: { $gte: historyWindowStart } }).sort({
      calculatedAt: 1,
    }),
  ]);

  // --- Lump sums for the "last 5 minutes" fallback calculation ---
  const recentCctv = cctvHistory.filter((e) => e.capturedAt >= since);
  const recentAtvm = atvmHistory.filter((e) => e.transactionAt >= since);
  const recentUts = utsHistory.filter((e) => e.transactionAt >= since);

  const cctvCount = recentCctv.reduce((sum, e) => sum + e.peopleCount, 0);
  const ticketCount =
    recentAtvm.reduce((sum, t) => sum + t.ticketsIssued, 0) +
    recentUts.reduce((sum, t) => sum + t.ticketsIssued, 0);

  // --- Bucketed time series for the AI engine (oldest -> newest) ---
  const recentEntryCounts = bucketCountsByTime(
    cctvHistory,
    (e) => e.capturedAt,
    (e) => e.peopleCount,
    HISTORY_BUCKETS,
    BUCKET_MINUTES
  );
  const recentTicketActivity = bucketCountsByTime(
    [...atvmHistory, ...utsHistory],
    (e) => e.transactionAt,
    (e) => e.ticketsIssued,
    HISTORY_BUCKETS,
    BUCKET_MINUTES
  );
  // We don't have a direct "exit" sensor feed in this schema yet, so
  // approximate it as a fraction of entries — a documented estimate,
  // not a fabricated ground-truth signal. Kept separate from the
  // fallback math, which never uses this value.
  const recentExitCounts = recentEntryCounts.map((v) => Math.round(v * 0.85));
  // Crowd density as a 0-1 fraction of capacity, from our own history.
  const recentCrowdDensity = crowdHistory
    .slice(-HISTORY_BUCKETS)
    .map((log) => Math.min(1.3, log.densityPercent / 100));
  while (recentCrowdDensity.length < HISTORY_BUCKETS) recentCrowdDensity.unshift(0);

  // Step 1: try the AI engine first (only stations it was trained on
  // will get a real prediction back — see lib/aiStationMap.ts)
  const aiResult = await getAiCrowdPrediction({
    stationName: station.name,
    timestamp: new Date().toISOString(),
    recentCrowdDensity,
    recentEntryCounts,
    recentExitCounts,
    recentTicketActivity,
  });

  let estimatedCount: number;
  let densityPercent: number;
  let level: ICrowdLog["level"];
  let aiAssisted = false;

  if (aiResult) {
    // AI engine responded — trust its numbers. It reports crowd as a
    // % of capacity, not a headcount, so convert using this
    // station's configured capacity to keep the CrowdLog schema
    // (which stores a headcount) unchanged.
    densityPercent = Math.round(aiResult.currentCrowdPercentage);
    estimatedCount = Math.round((densityPercent / 100) * station.capacity);
    level = mapAiRiskToCrowdLevel(aiResult.risk);
    // The AI engine's risk levels top out at "HIGH"; still apply our
    // own "critical" threshold on top so genuinely over-capacity
    // stations aren't under-reported just because the model's own
    // risk label caps at HIGH.
    if (densityPercent >= 100) level = "critical";
    aiAssisted = true;
  } else {
    // Step 2: fallback — simple, transparent blending rule.
    // CCTV headcount is the primary signal (people physically present),
    // ticket sales are added at a lower weight since ticket buyers
    // haven't necessarily entered the platform yet.
    estimatedCount = Math.round(cctvCount + ticketCount * 0.5);
    densityPercent = Math.round((estimatedCount / station.capacity) * 100);

    level = "low";
    if (densityPercent >= 100) level = "critical";
    else if (densityPercent >= 75) level = "high";
    else if (densityPercent >= 40) level = "moderate";
  }

  const crowdLog = await CrowdLog.create({
    station: stationId,
    estimatedCount,
    densityPercent,
    level,
    sourceBreakdown: { cctvCount, ticketCount },
    aiAssisted,
  });

  // Keep the digital twin's live station state (occupancy/inflow/outflow)
  // in sync with every new crowd calculation — this is what powers the
  // /api/heatmap endpoint and any other "current state" reads.
  await updateStationState(stationId, estimatedCount);

  return crowdLog;
}

/**
 * recalculateEtaForTrain
 * Human explanation: For one train, grabs its most recent GPS
 * ping, tries the AI engine's smarter ETA prediction, and falls
 * back to simple distance-over-speed math if it's unavailable or
 * either endpoint of this leg is outside the AI engine's trained
 * coverage. Saves the result as a new EtaLog entry.
 */
export async function recalculateEtaForTrain(trainId: string): Promise<IEtaLog | null> {
  const train = await Train.findById(trainId).populate<{
    currentStation: IStation | null;
    nextStation: IStation | null;
  }>(["currentStation", "nextStation"]);
  if (!train || !train.nextStation) return null;

  const latestPing = await GpsLog.findOne({ train: trainId }).sort({ recordedAt: -1 });
  if (!latestPing) return null;

  // Guard against divide-by-zero / stationary trains: assume a slow
  // crawl speed rather than pretending the ETA is "infinite"
  const speed = latestPing.speedKmph > 2 ? latestPing.speedKmph : 15;
  // distanceToNextStationM comes from the GPS device if available;
  // fall back to a generic short-hop distance estimate otherwise.
  const distanceMeters = latestPing.distanceToNextStationM ?? 1500;

  // The AI engine's ETA model needs both ends of the current leg by
  // name — only meaningful if we actually know the current station.
  const currentStationName = train.currentStation?.name;
  const nextStationName = train.nextStation.name;

  // Step 1: try the AI engine first
  const aiResult = currentStationName
    ? await getAiEtaPrediction({
        trainId,
        currentStationName,
        nextStationName,
        timestamp: new Date().toISOString(),
        speedKmph: speed,
        distanceToNextStationKm: distanceMeters / 1000,
        delayMinutes: 0,
        isFastTrain: false,
      })
    : null;

  let etaMinutes: number;
  let confidence: number;
  let aiAssisted = false;

  if (aiResult) {
    etaMinutes = Math.max(0, Math.round(aiResult.predictedMinutes));
    // The AI engine doesn't return a 0-1 confidence score directly;
    // derive one from whether it actually had a trained model to use
    // (modelUsed present) rather than inventing a number.
    confidence = aiResult.modelUsed ? 0.85 : 0.6;
    aiAssisted = true;
  } else {
    // Step 2: fallback — simple distance ÷ speed math
    const speedMetersPerMin = (speed * 1000) / 60;
    etaMinutes = Math.max(0, Math.round(distanceMeters / speedMetersPerMin));

    // Confidence drops if the GPS ping we're using is old
    const pingAgeSeconds = (Date.now() - latestPing.recordedAt.getTime()) / 1000;
    confidence = pingAgeSeconds > 60 ? 0.5 : 0.9;
  }

  const predictedArrival = new Date(Date.now() + etaMinutes * 60 * 1000);

  const etaLog = await EtaLog.create({
    train: trainId,
    targetStation: train.nextStation._id,
    etaMinutes,
    predictedArrival,
    confidence,
    aiAssisted,
  });

  return etaLog;
}

export { RECENT_WINDOW_MINUTES };
