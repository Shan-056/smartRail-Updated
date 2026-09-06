// ============================================================
// services/cameraService.ts
// ------------------------------------------------------------
// Camera Connection service layer for SmartRail Control Room.
//
// TODO: Real video capture pipeline (getUserMedia / WebRTC streams),
// real frame upload transport, and live edge computer-vision
// crowd-density inference from CCTV video feeds will be wired in here later.
// Currently, this service manages metadata connection states
// and device discovery scaffolding only without live video feeds.
// ============================================================

import { connectToDatabase } from "@/lib/mongodb";
import { CameraConnection, type ICameraConnection } from "@/models/CameraConnection";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

// In-memory fallback store to ensure consistent functionality when DB is not connected
export interface CameraRecord {
  id: string;
  stationId: string;
  stationName: string;
  label: string;
  status: "disconnected" | "connected";
  addedBy: string;
  addedAt: string;
}

const memoryCameras: CameraRecord[] = [];

export async function listCameras(): Promise<{
  cameras: CameraRecord[];
  stationStatusList: { stationId: string; stationName: string; code: string; line: string; cameras: CameraRecord[]; hasConnectedDevice: boolean }[];
}> {
  let cameras: CameraRecord[] = [];

  try {
    const db = await connectToDatabase();
    if (db) {
      const dbDocs = await CameraConnection.find().sort({ addedAt: -1 }).lean();
      cameras = dbDocs.map((doc: any) => ({
        id: doc._id.toString(),
        stationId: doc.stationId,
        stationName: doc.stationName || doc.stationId,
        label: doc.label,
        status: doc.status || "disconnected",
        addedBy: doc.addedBy,
        addedAt: new Date(doc.addedAt).toISOString(),
      }));
    } else {
      cameras = [...memoryCameras];
    }
  } catch {
    cameras = [...memoryCameras];
  }

  // Combine with Mumbai Stations to ensure every station defaults to "disconnected" / "No device connected."
  const stationStatusList = MUMBAI_STATIONS.map((stn) => {
    const stnCameras = cameras.filter(
      (c) => c.stationId === stn._id || c.stationId === stn.code || c.stationId.toLowerCase() === stn.name.toLowerCase()
    );
    return {
      stationId: stn._id,
      stationName: stn.name,
      code: stn.code,
      line: stn.line,
      cameras: stnCameras,
      hasConnectedDevice: stnCameras.some((c) => c.status === "connected"),
    };
  });

  return { cameras, stationStatusList };
}

export async function addCamera(params: {
  stationId: string;
  stationName?: string;
  label: string;
  addedBy: string;
}): Promise<CameraRecord> {
  const station = MUMBAI_STATIONS.find(
    (s) => s._id === params.stationId || s.code === params.stationId || s.name.toLowerCase() === params.stationId.toLowerCase()
  );
  const stnName = station ? station.name : (params.stationName || params.stationId);
  const stnId = station ? station.code : params.stationId;

  try {
    const db = await connectToDatabase();
    if (db) {
      const doc = await CameraConnection.create({
        stationId: stnId,
        stationName: stnName,
        label: params.label,
        status: "disconnected", // Defaults to disconnected as per specifications
        addedBy: params.addedBy,
        addedAt: new Date(),
      });
      const record: CameraRecord = {
        id: doc._id.toString(),
        stationId: doc.stationId,
        stationName: doc.stationName || stnName,
        label: doc.label,
        status: doc.status,
        addedBy: doc.addedBy,
        addedAt: doc.addedAt.toISOString(),
      };
      // Keep memory in sync
      memoryCameras.unshift(record);
      return record;
    }
  } catch {
    // Fall back to in-memory
  }

  const record: CameraRecord = {
    id: `cam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    stationId: stnId,
    stationName: stnName,
    label: params.label,
    status: "disconnected",
    addedBy: params.addedBy,
    addedAt: new Date().toISOString(),
  };
  memoryCameras.unshift(record);
  return record;
}

export async function deleteCamera(id: string): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    if (db) {
      await CameraConnection.findByIdAndDelete(id);
    }
  } catch {
    // Fall through
  }
  const idx = memoryCameras.findIndex((c) => c.id === id);
  if (idx !== -1) {
    memoryCameras.splice(idx, 1);
    return true;
  }
  return true;
}
