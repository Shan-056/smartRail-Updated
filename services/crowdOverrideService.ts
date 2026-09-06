// ============================================================
// services/crowdOverrideService.ts
// ------------------------------------------------------------
// Manages Operator and Admin manual crowd-level overrides.
// Overrides are stored distinctly from AI/calculated levels.
// ============================================================

import { connectToDatabase } from "@/lib/mongodb";
import { CrowdOverride, type ICrowdOverride } from "@/models/CrowdOverride";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export interface CrowdOverrideRecord {
  stationId: string;
  stationName: string;
  level: "low" | "medium" | "high" | "critical";
  densityPercent: number;
  reason?: string;
  setBy: string;
  setAt: string;
  active: boolean;
}

const memoryOverrides: Map<string, CrowdOverrideRecord> = new Map();

export async function getActiveOverrides(): Promise<CrowdOverrideRecord[]> {
  try {
    const db = await connectToDatabase();
    if (db) {
      const docs = await CrowdOverride.find({ active: true }).sort({ setAt: -1 }).lean();
      return docs.map((d: any) => ({
        stationId: d.stationId,
        stationName: d.stationName || d.stationId,
        level: d.level,
        densityPercent: d.densityPercent,
        reason: d.reason,
        setBy: d.setBy,
        setAt: new Date(d.setAt).toISOString(),
        active: d.active,
      }));
    }
  } catch {
    // Fall back to memory
  }
  return Array.from(memoryOverrides.values()).filter((o) => o.active);
}

export async function getOverrideForStation(stationId: string): Promise<CrowdOverrideRecord | null> {
  const normalizedId = stationId.toUpperCase();
  try {
    const db = await connectToDatabase();
    if (db) {
      const doc = await CrowdOverride.findOne({
        $or: [
          { stationId: normalizedId },
          { stationId: stationId },
        ],
        active: true,
      }).lean();
      if (doc) {
        return {
          stationId: (doc as any).stationId,
          stationName: (doc as any).stationName || (doc as any).stationId,
          level: (doc as any).level,
          densityPercent: (doc as any).densityPercent,
          reason: (doc as any).reason,
          setBy: (doc as any).setBy,
          setAt: new Date((doc as any).setAt).toISOString(),
          active: (doc as any).active,
        };
      }
    }
  } catch {
    // Fall back to memory
  }

  for (const [key, val] of memoryOverrides.entries()) {
    if ((key.toUpperCase() === normalizedId || key === stationId) && val.active) {
      return val;
    }
  }
  return null;
}

export async function setCrowdOverride(params: {
  stationId: string;
  level: "low" | "medium" | "high" | "critical";
  densityPercent?: number;
  reason?: string;
  setBy: string;
}): Promise<CrowdOverrideRecord> {
  const station = MUMBAI_STATIONS.find(
    (s) => s._id === params.stationId || s.code === params.stationId || s.name.toLowerCase() === params.stationId.toLowerCase()
  );
  const stnName = station ? station.name : params.stationId;
  const stnCode = station ? station.code : params.stationId.toUpperCase();

  const defaultDensity: Record<string, number> = {
    low: 28,
    medium: 56,
    high: 82,
    critical: 96,
  };

  const density = params.densityPercent ?? defaultDensity[params.level] ?? 50;

  try {
    const db = await connectToDatabase();
    if (db) {
      const doc = await CrowdOverride.findOneAndUpdate(
        { stationId: stnCode },
        {
          stationId: stnCode,
          stationName: stnName,
          level: params.level,
          densityPercent: density,
          reason: params.reason || "",
          setBy: params.setBy,
          setAt: new Date(),
          active: true,
        },
        { upsert: true, new: true }
      );
      const record: CrowdOverrideRecord = {
        stationId: doc.stationId,
        stationName: doc.stationName || stnName,
        level: doc.level,
        densityPercent: doc.densityPercent,
        reason: doc.reason,
        setBy: doc.setBy,
        setAt: doc.setAt.toISOString(),
        active: doc.active,
      };
      memoryOverrides.set(stnCode, record);
      return record;
    }
  } catch {
    // Fall through to memory
  }

  const record: CrowdOverrideRecord = {
    stationId: stnCode,
    stationName: stnName,
    level: params.level,
    densityPercent: density,
    reason: params.reason || "",
    setBy: params.setBy,
    setAt: new Date().toISOString(),
    active: true,
  };
  memoryOverrides.set(stnCode, record);
  return record;
}

export async function clearCrowdOverride(stationId: string): Promise<boolean> {
  const normalizedId = stationId.toUpperCase();
  try {
    const db = await connectToDatabase();
    if (db) {
      await CrowdOverride.deleteOne({
        $or: [{ stationId: normalizedId }, { stationId }],
      });
    }
  } catch {
    // Fall through
  }
  memoryOverrides.delete(normalizedId);
  memoryOverrides.delete(stationId);
  return true;
}
