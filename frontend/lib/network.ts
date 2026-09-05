// ============================================================
// lib/network.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Shared shapes and display constants used across the map,
// station panel, and prediction cards — kept in one place so a
// color or label only ever needs to change here.
// ============================================================

export type Line = "Western" | "Central" | "Harbour" | "Trans-Harbour";

export type Corridor =
  | "Churchgate-Virar"
  | "CSMT-Thane"
  | "Thane-Kalyan"
  | "Kalyan-Kasara"
  | "Kalyan-Karjat"
  | "CSMT-Panvel"
  | "Wadala-Goregaon"
  | "Thane-Panvel";

export interface Station {
  _id: string;
  code: string;
  name: string;
  line: Line;
  corridor: Corridor;
  aiStationId?: string;
  location: { lat: number; lng: number };
  platformCount: number;
  capacity: number;
  sequence: number;
  isInterchange?: boolean;
  interchangeLines?: Line[];
}

export const CORRIDOR_LABELS: Record<Corridor, string> = {
  "Churchgate-Virar": "Western (Churchgate \u2192 Virar)",
  "CSMT-Thane": "Central (CSMT \u2192 Thane)",
  "Thane-Kalyan": "Central (Thane \u2192 Kalyan)",
  "Kalyan-Kasara": "Central (Kalyan \u2192 Kasara)",
  "Kalyan-Karjat": "Central (Kalyan \u2192 Karjat)",
  "CSMT-Panvel": "Harbour (CSMT \u2192 Panvel)",
  "Wadala-Goregaon": "Harbour (Wadala \u2192 Goregaon)",
  "Thane-Panvel": "Trans-Harbour (Thane \u2192 Panvel)",
};

export const CORRIDOR_COLORS: Record<Corridor, string> = {
  "Churchgate-Virar": "#2563eb",
  "CSMT-Thane": "#dc2626",
  "Thane-Kalyan": "#b91c1c",
  "Kalyan-Kasara": "#d97706",
  "Kalyan-Karjat": "#059669",
  "CSMT-Panvel": "#0284c7",
  "Wadala-Goregaon": "#0d9488",
  "Thane-Panvel": "#7c3aed",
};

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#2fae5c",
  moderate: "#d9a919",
  high: "#e2762f",
  critical: "#df3f3f",
};

export function riskFromDensity(densityPercent: number): RiskLevel {
  if (densityPercent >= 100) return "critical";
  if (densityPercent >= 75) return "high";
  if (densityPercent >= 40) return "moderate";
  return "low";
}
