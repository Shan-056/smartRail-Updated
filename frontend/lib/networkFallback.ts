import { Station, Corridor, Line } from "./network";

export interface PlatformInfo {
  platformNumber: number;
  currentCrowdPercent: number;
  crowdLevel: "low" | "moderate" | "high" | "critical";
  nextTrainTime: string;
  nextTrainDestination: string;
  isFastTrainOnly?: boolean;
}

export interface TrainDeparture {
  id: string;
  trainNumber: string;
  destination: string;
  departureTime: string;
  minutesAway: number;
  platform: number;
  type: "Fast" | "Slow" | "AC Fast";
  line: Line;
  crowdLevel: "low" | "moderate" | "high" | "critical";
  crowdPercent: number;
  coaches: number[]; // 12 coaches crowd percentages (0-100)
  status: "On Time" | "2 min delay" | "4 min delay";
}

export interface JourneyLeg {
  legIndex: number;
  line: Line;
  corridor: Corridor;
  fromStation: Station;
  toStation: Station;
  stopsCount: number;
  durationMin: number;
  intermediateStations: Station[];
  trainType: "Fast" | "Slow" | "AC Fast";
  departureTime: string;
  minutesAway: number;
  platform: number;
  instructions: string;
}

export interface TransferInfo {
  stationName: string;
  interchangeStationFrom: Station;
  interchangeStationTo: Station;
  fromLine: Line;
  toLine: Line;
  transferTimeMin: number;
  instructions: string;
  fobWalkDesc: string;
}

export interface JourneyPlan {
  id?: string;
  routeName?: string;
  isRecommended?: boolean;
  viaTransferName?: string;
  fromStation: Station;
  toStation: Station;
  sameLine: boolean;
  requiresTransfer: boolean;
  transfer?: TransferInfo;
  legs: JourneyLeg[];
  line: Line;
  corridor: Corridor;
  distanceKm: number;
  durationFastMin: number;
  durationSlowMin: number;
  totalDurationMin: number;
  intermediateStations: Station[];
  stopsCount: number;
  nextDepartures: TrainDeparture[];
  coachRecommendation: string;
  fareInr: {
    secondClass: number;
    firstClass: number;
    acLocal: number;
  };
  allRouteOptions?: JourneyPlan[];
}

export function calculateMumbaiLocalFare(distanceKm: number): {
  secondClass: number;
  firstClass: number;
  acLocal: number;
} {
  // Official Mumbai Suburban Railway Fare Slabs (approved Indian Railways suburban fare table)
  if (distanceKm <= 10) {
    return { secondClass: 5, firstClass: 50, acLocal: 35 };
  } else if (distanceKm <= 20) {
    return { secondClass: 10, firstClass: 70, acLocal: 65 };
  } else if (distanceKm <= 35) {
    return { secondClass: 10, firstClass: 105, acLocal: 100 };
  } else if (distanceKm <= 45) {
    return { secondClass: 15, firstClass: 140, acLocal: 130 };
  } else if (distanceKm <= 60) {
    return { secondClass: 20, firstClass: 175, acLocal: 160 };
  } else if (distanceKm <= 80) {
    return { secondClass: 20, firstClass: 205, acLocal: 190 };
  } else if (distanceKm <= 105) {
    return { secondClass: 25, firstClass: 240, acLocal: 220 };
  } else {
    return { secondClass: 30, firstClass: 275, acLocal: 250 };
  }
}

export const MUMBAI_STATIONS: Station[] = [
  // ==========================================
  // 1. WESTERN LINE (Churchgate to Virar / Dahanu Road)
  // ==========================================
  { _id: "stn_ccg", code: "CCG", name: "Churchgate", line: "Western", corridor: "Churchgate-Virar", aiStationId: "CCG", location: { lat: 18.9322, lng: 72.8264 }, capacity: 6000, platformCount: 4, sequence: 0, isInterchange: false },
  { _id: "stn_mel", code: "MEL", name: "Marine Lines", line: "Western", corridor: "Churchgate-Virar", aiStationId: "MEL", location: { lat: 18.9438, lng: 72.8236 }, capacity: 3000, platformCount: 2, sequence: 1, isInterchange: false },
  { _id: "stn_crd", code: "CRD", name: "Charni Road", line: "Western", corridor: "Churchgate-Virar", aiStationId: "CRD", location: { lat: 18.9519, lng: 72.8188 }, capacity: 3000, platformCount: 2, sequence: 2, isInterchange: false },
  { _id: "stn_grt", code: "GRT", name: "Grant Road", line: "Western", corridor: "Churchgate-Virar", aiStationId: "GRT", location: { lat: 18.9632, lng: 72.8155 }, capacity: 3500, platformCount: 2, sequence: 3, isInterchange: false },
  { _id: "stn_mbc", code: "MBC", name: "Mumbai Central", line: "Western", corridor: "Churchgate-Virar", aiStationId: "MBC", location: { lat: 18.9696, lng: 72.8193 }, capacity: 5500, platformCount: 5, sequence: 4, isInterchange: false },
  { _id: "stn_mx", code: "MX", name: "Mahalaxmi", line: "Western", corridor: "Churchgate-Virar", location: { lat: 18.9827, lng: 72.8242 }, capacity: 3500, platformCount: 3, sequence: 5, isInterchange: false },
  { _id: "stn_pl", code: "PL", name: "Lower Parel", line: "Western", corridor: "Churchgate-Virar", location: { lat: 18.9950, lng: 72.8305 }, capacity: 5000, platformCount: 3, sequence: 6, isInterchange: false },
  { _id: "stn_pbhd", code: "PBHD", name: "Prabhadevi", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.0068, lng: 72.8375 }, capacity: 4800, platformCount: 3, sequence: 7, isInterchange: true, interchangeLines: ["Western", "Central"] },
  { _id: "stn_ddr_w", code: "DDR-W", name: "Dadar (Western)", line: "Western", corridor: "Churchgate-Virar", aiStationId: "DDR", location: { lat: 19.0178, lng: 72.8431 }, capacity: 9500, platformCount: 6, sequence: 8, isInterchange: true, interchangeLines: ["Western", "Central"] },
  { _id: "stn_mru", code: "MRU", name: "Matunga Road", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.0315, lng: 72.8441 }, capacity: 3000, platformCount: 2, sequence: 9, isInterchange: false },
  { _id: "stn_mm", code: "MM", name: "Mahim", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.0435, lng: 72.8427 }, capacity: 4200, platformCount: 4, sequence: 10, isInterchange: true, interchangeLines: ["Western", "Harbour"] },
  { _id: "stn_bnd", code: "BND", name: "Bandra", line: "Western", corridor: "Churchgate-Virar", aiStationId: "BND", location: { lat: 19.0544, lng: 72.8407 }, capacity: 7500, platformCount: 5, sequence: 11, isInterchange: true, interchangeLines: ["Western", "Harbour"] },
  { _id: "stn_khar", code: "KHAR", name: "Khar Road", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.0698, lng: 72.8398 }, capacity: 3500, platformCount: 4, sequence: 12, isInterchange: false },
  { _id: "stn_stc", code: "STC", name: "Santacruz", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.0825, lng: 72.8415 }, capacity: 4000, platformCount: 4, sequence: 13, isInterchange: false },
  { _id: "stn_vlp", code: "VLP", name: "Vile Parle", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.0995, lng: 72.8440 }, capacity: 4500, platformCount: 4, sequence: 14, isInterchange: false },
  { _id: "stn_and", code: "AND", name: "Andheri", line: "Western", corridor: "Churchgate-Virar", aiStationId: "AND", location: { lat: 19.1197, lng: 72.8464 }, capacity: 9000, platformCount: 6, sequence: 15, isInterchange: true, interchangeLines: ["Western", "Harbour"] },
  { _id: "stn_jos", code: "JOS", name: "Jogeshwari", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.1368, lng: 72.8488 }, capacity: 4000, platformCount: 4, sequence: 16, isInterchange: false },
  { _id: "stn_rmar", code: "RMAR", name: "Ram Mandir", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.1518, lng: 72.8481 }, capacity: 3500, platformCount: 4, sequence: 17, isInterchange: false },
  { _id: "stn_gmn", code: "GMN", name: "Goregaon", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.1648, lng: 72.8485 }, capacity: 6000, platformCount: 5, sequence: 18, isInterchange: true, interchangeLines: ["Western", "Harbour"] },
  { _id: "stn_mdd", code: "MDD", name: "Malad", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.1868, lng: 72.8490 }, capacity: 5500, platformCount: 4, sequence: 19, isInterchange: false },
  { _id: "stn_knd", code: "KND", name: "Kandivali", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.2045, lng: 72.8522 }, capacity: 5500, platformCount: 4, sequence: 20, isInterchange: false },
  { _id: "stn_bvi", code: "BVI", name: "Borivali", line: "Western", corridor: "Churchgate-Virar", aiStationId: "BVI", location: { lat: 19.2307, lng: 72.8567 }, capacity: 8500, platformCount: 7, sequence: 21, isInterchange: true, interchangeLines: ["Western"] },
  { _id: "stn_dic", code: "DIC", name: "Dahisar", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.2568, lng: 72.8595 }, capacity: 4000, platformCount: 4, sequence: 22, isInterchange: false },
  { _id: "stn_mira", code: "MIRA", name: "Mira Road", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.2825, lng: 72.8610 }, capacity: 5000, platformCount: 4, sequence: 23, isInterchange: false },
  { _id: "stn_byr", code: "BYR", name: "Bhayandar", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.3115, lng: 72.8520 }, capacity: 5500, platformCount: 4, sequence: 24, isInterchange: false },
  { _id: "stn_nig", code: "NIG", name: "Naigaon", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.3525, lng: 72.8450 }, capacity: 3500, platformCount: 3, sequence: 25, isInterchange: false },
  { _id: "stn_bsr", code: "BSR", name: "Vasai Road", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.3815, lng: 72.8335 }, capacity: 6000, platformCount: 5, sequence: 26, isInterchange: true, interchangeLines: ["Western"] },
  { _id: "stn_nsp", code: "NSP", name: "Nallasopara", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.4185, lng: 72.8220 }, capacity: 5500, platformCount: 4, sequence: 27, isInterchange: false },
  { _id: "stn_vr", code: "VR", name: "Virar", line: "Western", corridor: "Churchgate-Virar", aiStationId: "VR", location: { lat: 19.4559, lng: 72.8107 }, capacity: 6500, platformCount: 5, sequence: 28, isInterchange: true, interchangeLines: ["Western"] },
  { _id: "stn_plg", code: "PLG", name: "Palghar", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.6970, lng: 72.7660 }, capacity: 3000, platformCount: 3, sequence: 29, isInterchange: false },
  { _id: "stn_drd", code: "DRD", name: "Dahanu Road", line: "Western", corridor: "Churchgate-Virar", location: { lat: 19.9725, lng: 72.7380 }, capacity: 3200, platformCount: 3, sequence: 30, isInterchange: false },

  // ==========================================
  // 2. CENTRAL LINE (CSMT - Thane - Kalyan)
  // ==========================================
  { _id: "stn_csmt_c", code: "CSMT", name: "CSMT", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9398, lng: 72.8355 }, capacity: 9800, platformCount: 8, sequence: 0, isInterchange: true, interchangeLines: ["Central", "Harbour"] },
  { _id: "stn_msd_c", code: "MSD", name: "Masjid", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9525, lng: 72.8385 }, capacity: 3500, platformCount: 3, sequence: 1, isInterchange: false },
  { _id: "stn_snrd_c", code: "SNRD", name: "Sandhurst Road", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9615, lng: 72.8398 }, capacity: 3500, platformCount: 3, sequence: 2, isInterchange: true, interchangeLines: ["Central", "Harbour"] },
  { _id: "stn_by", code: "BY", name: "Byculla", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9750, lng: 72.8330 }, capacity: 4200, platformCount: 3, sequence: 3, isInterchange: false },
  { _id: "stn_chg", code: "CHG", name: "Chinchpokli", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9895, lng: 72.8335 }, capacity: 3000, platformCount: 2, sequence: 4, isInterchange: false },
  { _id: "stn_crd_c", code: "CRD-C", name: "Currey Road", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9985, lng: 72.8340 }, capacity: 3500, platformCount: 2, sequence: 5, isInterchange: false },
  { _id: "stn_pr", code: "PR", name: "Parel", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0075, lng: 72.8390 }, capacity: 5500, platformCount: 3, sequence: 6, isInterchange: true, interchangeLines: ["Central", "Western"] },
  { _id: "stn_ddr_c", code: "DDR-C", name: "Dadar (Central)", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0185, lng: 72.8440 }, capacity: 9800, platformCount: 7, sequence: 7, isInterchange: true, interchangeLines: ["Central", "Western"] },
  { _id: "stn_mtn", code: "MTN", name: "Matunga", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0298, lng: 72.8570 }, capacity: 3800, platformCount: 3, sequence: 8, isInterchange: false },
  { _id: "stn_sin", code: "SIN", name: "Sion", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0435, lng: 72.8625 }, capacity: 4800, platformCount: 3, sequence: 9, isInterchange: false },
  { _id: "stn_kur_c", code: "KUR", name: "Kurla", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0726, lng: 72.8845 }, capacity: 8500, platformCount: 6, sequence: 10, isInterchange: true, interchangeLines: ["Central", "Harbour"] },
  { _id: "stn_vvh", code: "VVH", name: "Vidyavihar", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0805, lng: 72.8985 }, capacity: 3500, platformCount: 3, sequence: 11, isInterchange: false },
  { _id: "stn_ghk", code: "GHK", name: "Ghatkopar", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0864, lng: 72.9081 }, capacity: 7500, platformCount: 4, sequence: 12, isInterchange: true, interchangeLines: ["Central"] },
  { _id: "stn_vk", code: "VK", name: "Vikhroli", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1115, lng: 72.9285 }, capacity: 4500, platformCount: 3, sequence: 13, isInterchange: false },
  { _id: "stn_kjmg", code: "KJMG", name: "Kanjurmarg", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1298, lng: 72.9340 }, capacity: 4000, platformCount: 3, sequence: 14, isInterchange: false },
  { _id: "stn_bndp", code: "BNDP", name: "Bhandup", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1465, lng: 72.9375 }, capacity: 4500, platformCount: 3, sequence: 15, isInterchange: false },
  { _id: "stn_nhu", code: "NHU", name: "Nahur", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1585, lng: 72.9405 }, capacity: 3500, platformCount: 2, sequence: 16, isInterchange: false },
  { _id: "stn_mum", code: "MUM", name: "Mulund", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1726, lng: 72.9425 }, capacity: 5500, platformCount: 4, sequence: 17, isInterchange: false },
  { _id: "stn_thn", code: "THN", name: "Thane", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1863, lng: 72.9750 }, capacity: 9500, platformCount: 8, sequence: 18, isInterchange: true, interchangeLines: ["Central", "Trans-Harbour"] },

  // Central Line (Thane - Kalyan)
  { _id: "stn_klw", code: "KLW", name: "Kalwa", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2003, lng: 72.9781 }, capacity: 3500, platformCount: 2, sequence: 19, isInterchange: false },
  { _id: "stn_mbr", code: "MBR", name: "Mumbra", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.1815, lng: 73.0175 }, capacity: 3800, platformCount: 2, sequence: 20, isInterchange: false },
  { _id: "stn_diva", code: "DIVA", name: "Diva", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.1937, lng: 73.0287 }, capacity: 4000, platformCount: 4, sequence: 21, isInterchange: true, interchangeLines: ["Central"] },
  { _id: "stn_kopr", code: "KOPR", name: "Kopar", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2098, lng: 73.0715 }, capacity: 3000, platformCount: 2, sequence: 22, isInterchange: false },
  { _id: "stn_dom", code: "DOM", name: "Dombivli", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2183, lng: 73.0864 }, capacity: 7500, platformCount: 5, sequence: 23, isInterchange: false },
  { _id: "stn_thk", code: "THK", name: "Thakurli", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2315, lng: 73.1025 }, capacity: 3200, platformCount: 2, sequence: 24, isInterchange: false },
  { _id: "stn_kyn", code: "KYN", name: "Kalyan", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2437, lng: 73.1305 }, capacity: 9500, platformCount: 8, sequence: 25, isInterchange: true, interchangeLines: ["Central"] },

  // Central Line (Kasara Branch)
  { _id: "stn_tit", code: "TIT", name: "Titwala", line: "Central", corridor: "Kalyan-Kasara", location: { lat: 19.2986, lng: 73.1897 }, capacity: 3500, platformCount: 3, sequence: 26, isInterchange: false },
  { _id: "stn_aso", code: "ASO", name: "Asangaon", line: "Central", corridor: "Kalyan-Kasara", location: { lat: 19.4350, lng: 73.2890 }, capacity: 3000, platformCount: 3, sequence: 27, isInterchange: false },
  { _id: "stn_ksr", code: "KSR", name: "Kasara", line: "Central", corridor: "Kalyan-Kasara", location: { lat: 19.6103, lng: 73.4870 }, capacity: 2500, platformCount: 3, sequence: 28, isInterchange: false },

  // Central Line (Karjat Branch)
  { _id: "stn_amn", code: "AMN", name: "Ambernath", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 19.1996, lng: 73.1927 }, capacity: 4200, platformCount: 3, sequence: 29, isInterchange: false },
  { _id: "stn_bdp", code: "BDP", name: "Badlapur", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 19.1556, lng: 73.2397 }, capacity: 4000, platformCount: 3, sequence: 30, isInterchange: false },
  { _id: "stn_nrl", code: "NRL", name: "Neral", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 19.0275, lng: 73.3185 }, capacity: 2800, platformCount: 3, sequence: 31, isInterchange: false },
  { _id: "stn_kjt", code: "KJT", name: "Karjat", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 18.9107, lng: 73.3236 }, capacity: 3000, platformCount: 3, sequence: 32, isInterchange: false },
  { _id: "stn_khpi", code: "KHPI", name: "Khopoli", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 18.7885, lng: 73.3450 }, capacity: 2200, platformCount: 2, sequence: 33, isInterchange: false },

  // ==========================================
  // 3. HARBOUR LINE (CSMT - Panvel)
  // ==========================================
  { _id: "stn_csmt_h", code: "CSMT-H", name: "CSMT (Harbour)", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 18.9405, lng: 72.8360 }, capacity: 8000, platformCount: 2, sequence: 0, isInterchange: true, interchangeLines: ["Harbour", "Central"] },
  { _id: "stn_msd_h", code: "MSD-H", name: "Masjid (Harbour)", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 18.9530, lng: 72.8390 }, capacity: 3000, platformCount: 2, sequence: 1, isInterchange: false },
  { _id: "stn_snrd_h", code: "SNRD-H", name: "Sandhurst Road (H)", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 18.9620, lng: 72.8402 }, capacity: 3200, platformCount: 2, sequence: 2, isInterchange: true, interchangeLines: ["Harbour", "Central"] },
  { _id: "stn_dkrd", code: "DKRD", name: "Dockyard Road", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 18.9685, lng: 72.8435 }, capacity: 2800, platformCount: 2, sequence: 3, isInterchange: false },
  { _id: "stn_rrd", code: "RRD", name: "Reay Road", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 18.9790, lng: 72.8475 }, capacity: 2800, platformCount: 2, sequence: 4, isInterchange: false },
  { _id: "stn_ctgn", code: "CTGN", name: "Cotton Green", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 18.9890, lng: 72.8515 }, capacity: 3000, platformCount: 2, sequence: 5, isInterchange: false },
  { _id: "stn_sve", code: "SVE", name: "Sewri", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0010, lng: 72.8560 }, capacity: 3200, platformCount: 2, sequence: 6, isInterchange: false },
  { _id: "stn_vdlr", code: "VDLR", name: "Wadala Road", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0195, lng: 72.8590 }, capacity: 6500, platformCount: 4, sequence: 7, isInterchange: true, interchangeLines: ["Harbour"] },
  { _id: "stn_gtbn", code: "GTBN", name: "GTB Nagar", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0370, lng: 72.8670 }, capacity: 3500, platformCount: 2, sequence: 8, isInterchange: false },
  { _id: "stn_chf", code: "CHF", name: "Chunabhatti", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0525, lng: 72.8750 }, capacity: 3200, platformCount: 2, sequence: 9, isInterchange: false },
  { _id: "stn_kur_h", code: "KUR-H", name: "Kurla (Harbour)", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0685, lng: 72.8870 }, capacity: 7500, platformCount: 3, sequence: 10, isInterchange: true, interchangeLines: ["Harbour", "Central"] },
  { _id: "stn_tkng", code: "TKNG", name: "Tilak Nagar", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0715, lng: 72.8985 }, capacity: 3200, platformCount: 2, sequence: 11, isInterchange: false },
  { _id: "stn_cmbr", code: "CMBR", name: "Chembur", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0620, lng: 72.9020 }, capacity: 4500, platformCount: 2, sequence: 12, isInterchange: false },
  { _id: "stn_gv", code: "GV", name: "Govandi", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0550, lng: 72.9150 }, capacity: 4200, platformCount: 2, sequence: 13, isInterchange: false },
  { _id: "stn_mnkd", code: "MNKD", name: "Mankhurd", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0490, lng: 72.9325 }, capacity: 4800, platformCount: 3, sequence: 14, isInterchange: false },
  { _id: "stn_vsh", code: "VSH", name: "Vashi", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0635, lng: 72.9995 }, capacity: 7500, platformCount: 4, sequence: 15, isInterchange: true, interchangeLines: ["Harbour", "Trans-Harbour"] },
  { _id: "stn_sncr", code: "SNCR", name: "Sanpada", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0665, lng: 73.0115 }, capacity: 4000, platformCount: 3, sequence: 16, isInterchange: true, interchangeLines: ["Harbour", "Trans-Harbour"] },
  { _id: "stn_jnj", code: "JNJ", name: "Juinagar", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0560, lng: 73.0185 }, capacity: 4500, platformCount: 3, sequence: 17, isInterchange: true, interchangeLines: ["Harbour", "Trans-Harbour"] },
  { _id: "stn_neu", code: "NEU", name: "Nerul", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0345, lng: 73.0180 }, capacity: 6000, platformCount: 4, sequence: 18, isInterchange: true, interchangeLines: ["Harbour", "Trans-Harbour"] },
  { _id: "stn_swdv", code: "SWDV", name: "Seawoods-Darave", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0190, lng: 73.0185 }, capacity: 5000, platformCount: 3, sequence: 19, isInterchange: false },
  { _id: "stn_bepr", code: "BEPR", name: "Belapur CBD", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0185, lng: 73.0395 }, capacity: 5500, platformCount: 4, sequence: 20, isInterchange: true, interchangeLines: ["Harbour"] },
  { _id: "stn_khag", code: "KHAG", name: "Kharghar", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0270, lng: 73.0685 }, capacity: 4800, platformCount: 3, sequence: 21, isInterchange: false },
  { _id: "stn_manr", code: "MANR", name: "Mansarovar", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0160, lng: 73.0905 }, capacity: 3500, platformCount: 2, sequence: 22, isInterchange: false },
  { _id: "stn_knds", code: "KNDS", name: "Khandeshwar", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 19.0065, lng: 73.1045 }, capacity: 3500, platformCount: 2, sequence: 23, isInterchange: false },
  { _id: "stn_pnvl", code: "PNVL", name: "Panvel", line: "Harbour", corridor: "CSMT-Panvel", location: { lat: 18.9900, lng: 73.1180 }, capacity: 7500, platformCount: 5, sequence: 24, isInterchange: true, interchangeLines: ["Harbour", "Trans-Harbour"] },

  // Harbour Line (Wadala to Goregaon Branch)
  { _id: "stn_kce", code: "KCE", name: "King's Circle", line: "Harbour", corridor: "Wadala-Goregaon", location: { lat: 19.0305, lng: 72.8580 }, capacity: 3000, platformCount: 2, sequence: 8, isInterchange: false },
  { _id: "stn_mm_h", code: "MM-H", name: "Mahim (Harbour)", line: "Harbour", corridor: "Wadala-Goregaon", location: { lat: 19.0435, lng: 72.8427 }, capacity: 4000, platformCount: 2, sequence: 9, isInterchange: true, interchangeLines: ["Harbour", "Western"] },
  { _id: "stn_bnd_h", code: "BND-H", name: "Bandra (Harbour)", line: "Harbour", corridor: "Wadala-Goregaon", location: { lat: 19.0544, lng: 72.8407 }, capacity: 7000, platformCount: 2, sequence: 10, isInterchange: true, interchangeLines: ["Harbour", "Western"] },
  { _id: "stn_and_h", code: "AND-H", name: "Andheri (Harbour)", line: "Harbour", corridor: "Wadala-Goregaon", location: { lat: 19.1197, lng: 72.8464 }, capacity: 8000, platformCount: 2, sequence: 11, isInterchange: true, interchangeLines: ["Harbour", "Western"] },
  { _id: "stn_gmn_h", code: "GMN-H", name: "Goregaon (Harbour)", line: "Harbour", corridor: "Wadala-Goregaon", location: { lat: 19.1648, lng: 72.8485 }, capacity: 5500, platformCount: 2, sequence: 12, isInterchange: true, interchangeLines: ["Harbour", "Western"] },

  // ==========================================
  // 4. TRANS-HARBOUR LINE (Thane - Panvel / Vashi)
  // ==========================================
  { _id: "stn_thn_t", code: "THN-T", name: "Thane (Trans-H)", line: "Trans-Harbour", corridor: "Thane-Panvel", location: { lat: 19.1863, lng: 72.9750 }, capacity: 8500, platformCount: 2, sequence: 0, isInterchange: true, interchangeLines: ["Trans-Harbour", "Central"] },
  { _id: "stn_digh", code: "DIGH", name: "Digha Gaon", line: "Trans-Harbour", corridor: "Thane-Panvel", location: { lat: 19.1765, lng: 72.9960 }, capacity: 2800, platformCount: 2, sequence: 1, isInterchange: false },
  { _id: "stn_airl", code: "AIRL", name: "Airoli", line: "Trans-Harbour", corridor: "Thane-Panvel", location: { lat: 19.1575, lng: 72.9985 }, capacity: 4200, platformCount: 2, sequence: 2, isInterchange: false },
  { _id: "stn_rabe", code: "RABE", name: "Rabale", line: "Trans-Harbour", corridor: "Thane-Panvel", location: { lat: 19.1360, lng: 73.0035 }, capacity: 3600, platformCount: 2, sequence: 3, isInterchange: false },
  { _id: "stn_gnsl", code: "GNSL", name: "Ghansoli", line: "Trans-Harbour", corridor: "Thane-Panvel", location: { lat: 19.1205, lng: 73.0080 }, capacity: 4500, platformCount: 2, sequence: 4, isInterchange: false },
  { _id: "stn_kopr_t", code: "KOPR-T", name: "Kopar Khairane", line: "Trans-Harbour", corridor: "Thane-Panvel", location: { lat: 19.0995, lng: 73.0110 }, capacity: 4200, platformCount: 2, sequence: 5, isInterchange: false },
  { _id: "stn_tuh", code: "TUH", name: "Turbhe", line: "Trans-Harbour", corridor: "Thane-Panvel", location: { lat: 19.0805, lng: 73.0185 }, capacity: 4000, platformCount: 3, sequence: 6, isInterchange: true, interchangeLines: ["Trans-Harbour"] },
];

export function getStationDepartures(station: Station): TrainDeparture[] {
  const now = new Date();
  const baseMinutes = [3, 8, 15, 22];

  return baseMinutes.map((mins, idx) => {
    const depDate = new Date(now.getTime() + mins * 60000);
    const timeStr = depDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

    let destination = "";
    let trainPrefix = "CR";
    if (station.line === "Western") {
      trainPrefix = "WR";
      destination = idx % 2 === 0 ? "Borivali" : "Virar Fast";
      if (idx === 3) destination = "Churchgate AC";
    } else if (station.line === "Central") {
      trainPrefix = "CR";
      destination = idx % 2 === 0 ? "Kalyan Fast" : "CSMT Slow";
      if (idx === 3) destination = "Kasara Fast";
    } else if (station.line === "Harbour") {
      trainPrefix = "HB";
      destination = idx % 2 === 0 ? "Panvel Slow" : "CSMT Slow";
      if (idx === 3) destination = "Goregaon Slow";
    } else {
      trainPrefix = "TH";
      destination = idx % 2 === 0 ? "Panvel" : "Thane";
    }

    const type: "Fast" | "Slow" | "AC Fast" =
      idx === 3 ? "AC Fast" : idx % 2 === 0 && (station.line === "Western" || station.line === "Central") ? "Fast" : "Slow";

    const crowdPercent = Math.min(95, Math.max(32, 42 + ((idx * 19) % 52)));
    const crowdLevel = crowdPercent >= 80 ? "high" : crowdPercent >= 55 ? "moderate" : "low";

    const coaches = [
      Math.min(95, crowdPercent + 14),
      Math.min(95, crowdPercent + 10),
      Math.max(25, crowdPercent - 15),
      Math.max(20, crowdPercent - 18),
      Math.max(20, crowdPercent - 20),
      crowdPercent,
      crowdPercent + 4,
      Math.max(25, crowdPercent - 12),
      crowdPercent + 6,
      crowdPercent + 12,
      Math.max(30, crowdPercent - 6),
      Math.min(95, crowdPercent + 10),
    ];

    return {
      id: `tr_${station.code}_${idx}`,
      trainNumber: `${trainPrefix}-${90000 + idx * 112}`,
      destination,
      departureTime: timeStr,
      minutesAway: mins,
      platform: Math.min(station.platformCount, (idx % station.platformCount) + 1),
      type,
      line: station.line,
      crowdLevel,
      crowdPercent,
      coaches,
      status: idx === 1 ? "2 min delay" : "On Time",
    };
  });
}

function getIntermediateStationsForCorridor(from: Station, to: Station): Station[] {
  if (from.corridor === to.corridor) {
    return MUMBAI_STATIONS.filter((s) => {
      if (s.corridor !== from.corridor) return false;
      const minSeq = Math.min(from.sequence, to.sequence);
      const maxSeq = Math.max(from.sequence, to.sequence);
      return s.sequence >= minSeq && s.sequence <= maxSeq;
    }).sort((a, b) => (from.sequence <= to.sequence ? a.sequence - b.sequence : b.sequence - a.sequence));
  }

  // Same line, different corridors (e.g. CSMT-Thane to Thane-Kalyan)
  return MUMBAI_STATIONS.filter((s) => s.line === from.line).sort((a, b) => {
    return from.sequence <= to.sequence ? a.sequence - b.sequence : b.sequence - a.sequence;
  });
}

function buildSingleLegJourneyPlan(from: Station, to: Station, isFast: boolean = false): JourneyPlan {
  const intermediate = getIntermediateStationsForCorridor(from, to);
  let stopsCount = Math.max(1, intermediate.length > 0 ? intermediate.length - 1 : Math.abs(to.sequence - from.sequence));
  if (isFast && stopsCount > 6) {
    stopsCount = Math.max(4, Math.round(stopsCount * 0.45));
  }

  const distanceKm = Math.max(3, Math.round(stopsCount * 1.9));
  const durationFastMin = Math.round(stopsCount * 2.2 + 3);
  const durationSlowMin = Math.round(stopsCount * 3.2 + 4);
  const totalDurationMin = isFast ? durationFastMin : durationSlowMin;

  const departures = getStationDepartures(from).map((dep, idx) => ({
    ...dep,
    destination: to.name + (isFast ? " Fast" : " Slow"),
    type: isFast ? ("Fast" as const) : ("Slow" as const),
  }));

  const fare = calculateMumbaiLocalFare(distanceKm);

  let coachRec = "Coaches 4 and 5 (middle of train) typically offer the best balance of seating and quick platform exits.";
  if (from.sequence < to.sequence) {
    coachRec = "Northbound direction: Board Coaches 4-6 to exit conveniently near foot overbridges.";
  }

  const singleLeg: JourneyLeg = {
    legIndex: 1,
    line: from.line,
    corridor: from.corridor,
    fromStation: from,
    toStation: to,
    stopsCount,
    durationMin: totalDurationMin,
    intermediateStations: intermediate,
    trainType: isFast ? "Fast" : "Slow",
    departureTime: departures[0]?.departureTime || "07:30 AM",
    minutesAway: departures[0]?.minutesAway || 3,
    platform: departures[0]?.platform || 1,
    instructions: `Board direct ${isFast ? "Fast" : "Slow"} ${from.line} Line local from ${from.name} (PF ${departures[0]?.platform || 1}) heading to ${to.name}.`,
  };

  return {
    id: `opt_direct_${isFast ? "fast" : "slow"}`,
    routeName: isFast ? "Fast Local (Fewer Stops)" : "All-Stop Slow Local",
    isRecommended: !isFast || stopsCount <= 6,
    fromStation: from,
    toStation: to,
    sameLine: true,
    requiresTransfer: false,
    legs: [singleLeg],
    line: from.line,
    corridor: from.corridor,
    distanceKm,
    durationFastMin,
    durationSlowMin,
    totalDurationMin,
    intermediateStations: intermediate,
    stopsCount,
    nextDepartures: departures,
    coachRecommendation: coachRec,
    fareInr: fare,
  };
}

function buildTransferJourneyPlan(
  from: Station,
  to: Station,
  interchangeStationName: string,
  transferTimeMin: number,
  fobWalkDesc: string,
  index: number
): JourneyPlan | null {
  // Find station on line 1 and station on line 2 matching interchange name
  const interchangeFrom = MUMBAI_STATIONS.find(
    (s) => s.line === from.line && (s.name.toLowerCase().includes(interchangeStationName.toLowerCase()) || s.code.toLowerCase().includes(interchangeStationName.toLowerCase().slice(0, 3)))
  );

  const interchangeTo = MUMBAI_STATIONS.find(
    (s) => s.line === to.line && (s.name.toLowerCase().includes(interchangeStationName.toLowerCase()) || s.code.toLowerCase().includes(interchangeStationName.toLowerCase().slice(0, 3)))
  );

  if (!interchangeFrom || !interchangeTo) return null;
  // If from or to is the interchange itself, skip this transfer route
  if (from.code === interchangeFrom.code || to.code === interchangeTo.code) return null;

  // Leg 1: from -> interchangeFrom
  const intermediateLeg1 = getIntermediateStationsForCorridor(from, interchangeFrom);
  const stopsLeg1 = Math.max(1, intermediateLeg1.length > 0 ? intermediateLeg1.length - 1 : Math.abs(interchangeFrom.sequence - from.sequence));
  const durationLeg1 = Math.round(stopsLeg1 * 2.8 + 3);

  // Leg 2: interchangeTo -> to
  const intermediateLeg2 = getIntermediateStationsForCorridor(interchangeTo, to);
  const stopsLeg2 = Math.max(1, intermediateLeg2.length > 0 ? intermediateLeg2.length - 1 : Math.abs(to.sequence - interchangeTo.sequence));
  const durationLeg2 = Math.round(stopsLeg2 * 2.8 + 3);

  const totalDurationMin = durationLeg1 + transferTimeMin + durationLeg2;
  const stopsCount = stopsLeg1 + stopsLeg2;
  const distanceKm = Math.max(4, Math.round(stopsCount * 1.8));
  const fare = calculateMumbaiLocalFare(distanceKm);

  const departuresLeg1 = getStationDepartures(from).map((dep, idx) => ({
    ...dep,
    destination: interchangeFrom.name + (idx % 2 === 0 ? " Fast" : " Slow"),
  }));

  const departuresLeg2 = getStationDepartures(interchangeTo).map((dep, idx) => ({
    ...dep,
    destination: to.name + (idx % 2 === 0 ? " Fast" : " Slow"),
  }));

  const leg1: JourneyLeg = {
    legIndex: 1,
    line: from.line,
    corridor: from.corridor,
    fromStation: from,
    toStation: interchangeFrom,
    stopsCount: stopsLeg1,
    durationMin: durationLeg1,
    intermediateStations: intermediateLeg1,
    trainType: "Slow",
    departureTime: departuresLeg1[0]?.departureTime || "07:30 AM",
    minutesAway: departuresLeg1[0]?.minutesAway || 3,
    platform: departuresLeg1[0]?.platform || 1,
    instructions: `Board ${from.line} Line train from ${from.name} (PF ${departuresLeg1[0]?.platform || 1}) heading to ${interchangeFrom.name}. Travel ${stopsLeg1} stops (~${durationLeg1} mins).`,
  };

  const leg2: JourneyLeg = {
    legIndex: 2,
    line: to.line,
    corridor: to.corridor,
    fromStation: interchangeTo,
    toStation: to,
    stopsCount: stopsLeg2,
    durationMin: durationLeg2,
    intermediateStations: intermediateLeg2,
    trainType: "Slow",
    departureTime: departuresLeg2[0]?.departureTime || "07:48 AM",
    minutesAway: departuresLeg2[0]?.minutesAway || 6,
    platform: departuresLeg2[0]?.platform || 2,
    instructions: `Board ${to.line} Line connecting train from ${interchangeTo.name} (PF ${departuresLeg2[0]?.platform || 2}) to ${to.name}. Travel ${stopsLeg2} stops (~${durationLeg2} mins).`,
  };

  const transfer: TransferInfo = {
    stationName: `${interchangeStationName} Junction`,
    interchangeStationFrom: interchangeFrom,
    interchangeStationTo: interchangeTo,
    fromLine: from.line,
    toLine: to.line,
    transferTimeMin,
    instructions: `Alight at ${interchangeFrom.name}. Follow signs to ${to.line} Line platforms. ${fobWalkDesc}`,
    fobWalkDesc,
  };

  const allIntermediate = [
    ...intermediateLeg1,
    ...intermediateLeg2.filter((s) => !intermediateLeg1.some((i) => i.code === s.code)),
  ];

  return {
    id: `opt_transfer_${interchangeStationName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${index}`,
    routeName: `Via ${interchangeStationName}`,
    viaTransferName: interchangeStationName,
    isRecommended: false,
    fromStation: from,
    toStation: to,
    sameLine: false,
    requiresTransfer: true,
    transfer,
    legs: [leg1, leg2],
    line: from.line,
    corridor: from.corridor,
    distanceKm,
    durationFastMin: Math.round(totalDurationMin * 0.82),
    durationSlowMin: totalDurationMin,
    totalDurationMin,
    intermediateStations: allIntermediate,
    stopsCount,
    nextDepartures: departuresLeg1,
    coachRecommendation: `Transfer tip: Board Coaches 4-6 on Leg 1 so you alight directly beside the ${interchangeStationName} central foot overbridge staircase.`,
    fareInr: fare,
  };
}

export function planJourney(fromStationIdOrCode: string, toStationIdOrCode: string): JourneyPlan | null {
  const from = MUMBAI_STATIONS.find(
    (s) => s._id === fromStationIdOrCode || s.code.toLowerCase() === fromStationIdOrCode.toLowerCase()
  );
  const to = MUMBAI_STATIONS.find(
    (s) => s._id === toStationIdOrCode || s.code.toLowerCase() === toStationIdOrCode.toLowerCase()
  );

  if (!from || !to) return null;

  const sameLine = from.line === to.line;

  // Case 1: Same line direct journey
  if (sameLine) {
    const slowPlan = buildSingleLegJourneyPlan(from, to, false);
    if (slowPlan.stopsCount >= 7 && (from.line === "Western" || from.line === "Central")) {
      const fastPlan = buildSingleLegJourneyPlan(from, to, true);
      fastPlan.isRecommended = true;
      slowPlan.isRecommended = false;
      const options = [fastPlan, slowPlan];
      fastPlan.allRouteOptions = options;
      slowPlan.allRouteOptions = options;
      return fastPlan;
    }
    slowPlan.allRouteOptions = [slowPlan];
    return slowPlan;
  }

  // Case 2: Different lines — generate candidates for transfers
  interface Candidate {
    name: string;
    transferTimeMin: number;
    fobWalkDesc: string;
  }

  const candidates: Candidate[] = [];

  // Harbour <-> Central (or Central <-> Harbour)
  if ((from.line === "Central" && to.line === "Harbour") || (from.line === "Harbour" && to.line === "Central")) {
    candidates.push(
      {
        name: "Sandhurst Road",
        transferTimeMin: 3,
        fobWalkDesc: "Walk down the footbridge/stairs between Sandhurst Road Harbour elevated platforms and Central slow platforms (~3 mins).",
      },
      {
        name: "Kurla",
        transferTimeMin: 5,
        fobWalkDesc: "Use the high-level skywalk at Kurla Junction to switch between Central main line (PF 1-4) and Harbour elevated platforms (PF 7-8) (~5 mins).",
      },
      {
        name: "CSMT",
        transferTimeMin: 4,
        fobWalkDesc: "Walk along the main concourse at CSMT between Central Main Line terminus and Harbour platforms 1 & 2.",
      }
    );
  }
  // Western <-> Central (or Central <-> Western)
  else if ((from.line === "Western" && to.line === "Central") || (from.line === "Central" && to.line === "Western")) {
    candidates.push(
      {
        name: "Dadar",
        transferTimeMin: 4,
        fobWalkDesc: "Take the central Foot Overbridge (FOB) at Dadar Junction connecting Western platforms (PF 1-4) and Central platforms (PF 1-8).",
      },
      {
        name: "Prabhadevi",
        transferTimeMin: 5,
        fobWalkDesc: "Walk through the dedicated inter-railway passenger connector between Prabhadevi (Western) and Parel (Central).",
      }
    );
  }
  // Western <-> Harbour (or Harbour <-> Western)
  else if ((from.line === "Western" && to.line === "Harbour") || (from.line === "Harbour" && to.line === "Western")) {
    candidates.push(
      {
        name: "Bandra",
        transferTimeMin: 3,
        fobWalkDesc: "Cross platform at Bandra Junction between Western Line (PF 1/2) and Harbour Line (PF 5).",
      },
      {
        name: "Andheri",
        transferTimeMin: 3,
        fobWalkDesc: "Use the north skywalk at Andheri to switch between Western and Harbour platforms.",
      },
      {
        name: "Mahim",
        transferTimeMin: 2,
        fobWalkDesc: "Cross Foot Overbridge at Mahim Junction between Western and Harbour tracks.",
      }
    );
  }
  // Central <-> Trans-Harbour (or Trans-Harbour <-> Central)
  else if ((from.line === "Central" && to.line === "Trans-Harbour") || (from.line === "Trans-Harbour" && to.line === "Central")) {
    candidates.push({
      name: "Thane",
      transferTimeMin: 4,
      fobWalkDesc: "Walk across Thane East Overbridge to connect to Trans-Harbour Line platforms (PF 9/10).",
    });
  }
  // Harbour <-> Trans-Harbour
  else {
    candidates.push(
      {
        name: "Vashi",
        transferTimeMin: 3,
        fobWalkDesc: "Same station concourse at Vashi. Switch platforms for Trans-Harbour line.",
      },
      {
        name: "Nerul",
        transferTimeMin: 3,
        fobWalkDesc: "Cross Foot Overbridge at Nerul Junction to switch platforms.",
      }
    );
  }

  // Build journey plan for each candidate
  const generatedPlans: JourneyPlan[] = [];
  candidates.forEach((cand, idx) => {
    const plan = buildTransferJourneyPlan(from, to, cand.name, cand.transferTimeMin, cand.fobWalkDesc, idx);
    if (plan) {
      generatedPlans.push(plan);
    }
  });

  if (generatedPlans.length === 0) {
    // Fallback if none matched
    const fallback = buildTransferJourneyPlan(from, to, "Dadar", 4, "Walk across Foot Overbridge.", 0);
    if (fallback) return fallback;
    return null;
  }

  // Sort generated plans by total duration (shortest first)
  generatedPlans.sort((a, b) => a.totalDurationMin - b.totalDurationMin);

  // Set the first as recommended
  generatedPlans[0].isRecommended = true;
  generatedPlans[0].routeName = `${generatedPlans[0].routeName} (Fastest)`;

  // Attach all options to each plan so user can toggle between them
  generatedPlans.forEach((p) => {
    p.allRouteOptions = generatedPlans;
  });

  return generatedPlans[0];
}
