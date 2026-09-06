// ============================================================
// services/alertService.ts
// ------------------------------------------------------------
// Operations Alerts system service.
// Supports creation by Operator/Admin, resolution by Operator/Admin,
// deletion strictly by Admin, and read-only viewing for Passengers.
// ============================================================

import { connectToDatabase } from "@/lib/mongodb";
import { Alert, type IAlert } from "@/models/Alert";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export interface AlertRecord {
  id: string;
  stationId: string;
  stationName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

const memoryAlerts: AlertRecord[] = [
  {
    id: "alert_init_1",
    stationId: "DDR",
    stationName: "Dadar",
    message: "Platform 3 FOB maintenance in progress. Expect footfall bottleneck during evening peak.",
    severity: "warning",
    createdBy: "operator",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "alert_init_2",
    stationId: "KUR",
    stationName: "Kurla",
    message: "Rain surge drainage pump active on Platform 1 track bed. Train speeds restricted to 20 km/h.",
    severity: "critical",
    createdBy: "admin",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export async function listAlerts(params?: {
  stationId?: string;
  activeOnly?: boolean;
}): Promise<AlertRecord[]> {
  try {
    const db = await connectToDatabase();
    if (db) {
      const query: any = {};
      if (params?.activeOnly) {
        query.resolvedAt = { $exists: false };
      }
      if (params?.stationId) {
        const sid = params.stationId.toUpperCase();
        query.$or = [{ stationId: sid }, { stationId: "ALL" }];
      }
      const docs = await Alert.find(query).sort({ createdAt: -1 }).lean();
      if (docs.length > 0) {
        return docs.map((d: any) => ({
          id: d._id.toString(),
          stationId: d.stationId,
          stationName: d.stationName || d.stationId,
          message: d.message,
          severity: d.severity,
          createdBy: d.createdBy,
          createdAt: new Date(d.createdAt).toISOString(),
          resolvedAt: d.resolvedAt ? new Date(d.resolvedAt).toISOString() : undefined,
          resolvedBy: d.resolvedBy,
        }));
      }
    }
  } catch {
    // Fall back to memory
  }

  let list = [...memoryAlerts];
  if (params?.activeOnly) {
    list = list.filter((a) => !a.resolvedAt);
  }
  if (params?.stationId) {
    const sid = params.stationId.toUpperCase();
    list = list.filter((a) => a.stationId.toUpperCase() === sid || a.stationId === "ALL");
  }
  return list;
}

export async function createAlert(params: {
  stationId: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdBy: string;
}): Promise<AlertRecord> {
  const station = MUMBAI_STATIONS.find(
    (s) => s._id === params.stationId || s.code === params.stationId || s.name.toLowerCase() === params.stationId.toLowerCase()
  );
  const stnName = params.stationId === "ALL" ? "All Mumbai Network" : (station ? station.name : params.stationId);
  const stnCode = params.stationId === "ALL" ? "ALL" : (station ? station.code : params.stationId.toUpperCase());

  try {
    const db = await connectToDatabase();
    if (db) {
      const doc = await Alert.create({
        stationId: stnCode,
        stationName: stnName,
        message: params.message,
        severity: params.severity,
        createdBy: params.createdBy,
        createdAt: new Date(),
      });
      const record: AlertRecord = {
        id: doc._id.toString(),
        stationId: doc.stationId,
        stationName: doc.stationName || stnName,
        message: doc.message,
        severity: doc.severity,
        createdBy: doc.createdBy,
        createdAt: doc.createdAt.toISOString(),
      };
      memoryAlerts.unshift(record);
      return record;
    }
  } catch {
    // Fall through
  }

  const record: AlertRecord = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    stationId: stnCode,
    stationName: stnName,
    message: params.message,
    severity: params.severity,
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
  };
  memoryAlerts.unshift(record);
  return record;
}

export async function resolveAlert(id: string, resolvedBy: string): Promise<AlertRecord | null> {
  try {
    const db = await connectToDatabase();
    if (db) {
      const doc = await Alert.findByIdAndUpdate(
        id,
        { resolvedAt: new Date(), resolvedBy },
        { new: true }
      ).lean();
      if (doc) {
        const resRec: AlertRecord = {
          id: (doc as any)._id.toString(),
          stationId: (doc as any).stationId,
          stationName: (doc as any).stationName,
          message: (doc as any).message,
          severity: (doc as any).severity,
          createdBy: (doc as any).createdBy,
          createdAt: new Date((doc as any).createdAt).toISOString(),
          resolvedAt: new Date((doc as any).resolvedAt).toISOString(),
          resolvedBy: (doc as any).resolvedBy,
        };
        const mIdx = memoryAlerts.findIndex((a) => a.id === id);
        if (mIdx !== -1) memoryAlerts[mIdx] = resRec;
        return resRec;
      }
    }
  } catch {
    // Fall through
  }

  const mIdx = memoryAlerts.findIndex((a) => a.id === id);
  if (mIdx !== -1) {
    memoryAlerts[mIdx].resolvedAt = new Date().toISOString();
    memoryAlerts[mIdx].resolvedBy = resolvedBy;
    return memoryAlerts[mIdx];
  }
  return null;
}

export async function deleteAlert(id: string): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    if (db) {
      await Alert.findByIdAndDelete(id);
    }
  } catch {
    // Fall through
  }
  const idx = memoryAlerts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    memoryAlerts.splice(idx, 1);
    return true;
  }
  return true;
}
