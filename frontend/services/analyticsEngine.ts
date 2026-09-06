// ============================================================
// services/analyticsEngine.ts
// ------------------------------------------------------------
// Turns raw data into crowd density and train ETA predictions.
// Tries AI engine first, falls back to mathematical models.
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
import { resolveAiStationId, mapAiRiskToCrowdLevel } from "@/lib/aiStationMap";
import { updateStationState } from "./digitalTwin";
import { riskFromDensity } from "@/lib/network";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

const RECENT_WINDOW_MINUTES = 5;
const HISTORY_BUCKETS = 12;
const BUCKET_MINUTES = 5;

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
      const idx = bucketCount - 1 - bucketIndexFromNow;
      buckets[idx] += getValue(event);
    }
  }

  return buckets;
}

export async function recalculateCrowdForStation(stationId: string): Promise<ICrowdLog | null> {
  const historyWindowStart = new Date(Date.now() - HISTORY_BUCKETS * BUCKET_MINUTES * 60 * 1000);
  const since = new Date(Date.now() - RECENT_WINDOW_MINUTES * 60 * 1000);

  const station = await Station.findById(stationId);
  if (!station) return null;

  const [cctvHistory, atvmHistory, utsHistory, crowdHistory] = await Promise.all([
    CctvEvent.find({ station: stationId, capturedAt: { $gte: historyWindowStart } }),
    AtvmLog.find({ station: stationId, transactionAt: { $gte: historyWindowStart } }),
    UtsLog.find({ station: stationId, transactionAt: { $gte: historyWindowStart } }),
    CrowdLog.find({ station: stationId, calculatedAt: { $gte: historyWindowStart } }).sort({
      calculatedAt: 1,
    }),
  ]);

  const recentCctv = cctvHistory.filter((e) => e.capturedAt >= since);
  const recentAtvm = atvmHistory.filter((e) => e.transactionAt >= since);
  const recentUts = utsHistory.filter((e) => e.transactionAt >= since);

  const cctvCount = recentCctv.reduce((sum, e) => sum + e.peopleCount, 0);
  const ticketCount =
    recentAtvm.reduce((sum, t) => sum + t.ticketsIssued, 0) +
    recentUts.reduce((sum, t) => sum + t.ticketsIssued, 0);

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
  const recentExitCounts = recentEntryCounts.map((v) => Math.round(v * 0.85));
  const recentCrowdDensity = crowdHistory
    .slice(-HISTORY_BUCKETS)
    .map((log) => Math.min(1.3, log.densityPercent / 100));
  while (recentCrowdDensity.length < HISTORY_BUCKETS) recentCrowdDensity.unshift(0);

  const aiStationId = resolveAiStationId(station.name);
  const aiResult = aiStationId
    ? await getAiCrowdPrediction({
        station_id: aiStationId,
        timestamp: new Date().toISOString(),
        recent_crowd_density: recentCrowdDensity,
        recent_entry_counts: recentEntryCounts,
        recent_exit_counts: recentExitCounts,
        recent_ticket_activity: recentTicketActivity,
      })
    : null;

  let estimatedCount: number;
  let densityPercent: number;
  let level: ICrowdLog["level"];
  let aiAssisted = false;

  if (aiResult) {
    densityPercent = Math.round(aiResult.currentCrowdPercentage);
    estimatedCount = Math.round((densityPercent / 100) * station.capacity);
    level = mapAiRiskToCrowdLevel(aiResult.risk);
    if (densityPercent >= 100) level = "critical";
    aiAssisted = true;
  } else {
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

  await updateStationState(stationId, estimatedCount);

  return crowdLog;
}

export async function recalculateEtaForTrain(trainId: string): Promise<IEtaLog | null> {
  const train = await Train.findById(trainId).populate<{
    currentStation: IStation | null;
    nextStation: IStation | null;
  }>(["currentStation", "nextStation"]);
  if (!train || !train.nextStation) return null;

  const latestPing = await GpsLog.findOne({ train: trainId }).sort({ recordedAt: -1 });
  if (!latestPing) return null;

  const speed = latestPing.speedKmph > 2 ? latestPing.speedKmph : 15;
  const distanceMeters = latestPing.distanceToNextStationM ?? 1500;

  const currentStationAiId = train.currentStation?.name
    ? resolveAiStationId(train.currentStation.name)
    : null;
  const nextStationAiId = train.nextStation?.name
    ? resolveAiStationId(train.nextStation.name)
    : null;

  const aiResult = currentStationAiId && nextStationAiId
    ? await getAiEtaPrediction({
        train_id: trainId,
        station_id: currentStationAiId,
        next_station_id: nextStationAiId,
        timestamp: new Date().toISOString(),
        speed_kmh: speed,
        distance_to_next_station_km: distanceMeters / 1000,
        delay_min: 0,
        train_type_fast: false,
      })
    : null;

  let etaMinutes: number;
  let confidence: number;
  let aiAssisted = false;

  if (aiResult) {
    etaMinutes = Math.max(0, Math.round(aiResult.predictedMinutes));
    confidence = aiResult.modelMetadata?.model ? 0.85 : 0.6;
    aiAssisted = true;
  } else {
    const speedMetersPerMin = (speed * 1000) / 60;
    etaMinutes = Math.max(0, Math.round(distanceMeters / speedMetersPerMin));
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

export async function predictCongestionForStation(stationId: string) {
  const station = await Station.findById(stationId);
  const fallbackStation = MUMBAI_STATIONS.find(
    (s) => s._id === stationId || s.code.toLowerCase() === stationId.toLowerCase()
  ) || MUMBAI_STATIONS[0];

  const stationName = station?.name || fallbackStation.name;
  const seq = fallbackStation.sequence;
  const currentDensity = Math.min(95, Math.max(30, 48 + ((seq * 9) % 40)));
  const surgeRisk15Min = Math.min(90, Math.max(20, currentDensity + 10));

  return {
    stationId,
    stationName,
    currentDensity,
    currentRisk: riskFromDensity(currentDensity),
    surgeRisk15Min,
    forecastRisk: riskFromDensity(surgeRisk15Min),
    advisory:
      surgeRisk15Min > 75
        ? "High platform influx anticipated in next 15 minutes. Consider alternate coach positions or delayed entry."
        : "Station platform flow is operating within normal throughput parameters.",
    calculatedAt: new Date().toISOString(),
  };
}

export async function predictOccupancyForTrain(trainId: string) {
  const train = await Train.findById(trainId);
  const trainNumber = train?.trainNumber || `TRAIN-${trainId.slice(-4)}`;
  const baseOccupancy = (train?.occupancyPercent || 65) / 100;
  const jitter = ((trainId.charCodeAt(trainId.length - 1) % 20) - 10) / 100;
  const predictedOccupancy = Math.max(0.2, Math.min(1.4, baseOccupancy + jitter));

  return {
    trainId: trainNumber,
    predictedOccupancy,
    direction: train?.direction || "Down",
    status: train?.status || "running",
  };
}

export { RECENT_WINDOW_MINUTES };
