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

export interface JourneyPlan {
  fromStation: Station;
  toStation: Station;
  sameLine: boolean;
  line: Line;
  corridor: Corridor;
  distanceKm: number;
  durationFastMin: number;
  durationSlowMin: number;
  intermediateStations: Station[];
  stopsCount: number;
  nextDepartures: TrainDeparture[];
  coachRecommendation: string;
  fareInr: {
    secondClass: number;
    firstClass: number;
    acLocal: number;
  };
}

export const MUMBAI_STATIONS: Station[] = [
  // Western Line (Churchgate to Virar)
  { _id: "stn_ccg", code: "CCG", name: "Churchgate", line: "Western", corridor: "Churchgate-Virar", aiStationId: "CCG", location: { lat: 18.9322, lng: 72.8264 }, capacity: 6000, platformCount: 4, sequence: 0 },
  { _id: "stn_mel", code: "MEL", name: "Marine Lines", line: "Western", corridor: "Churchgate-Virar", aiStationId: "MEL", location: { lat: 18.9438, lng: 72.8236 }, capacity: 3000, platformCount: 2, sequence: 1 },
  { _id: "stn_crd", code: "CRD", name: "Charni Road", line: "Western", corridor: "Churchgate-Virar", aiStationId: "CRD", location: { lat: 18.9519, lng: 72.8188 }, capacity: 3000, platformCount: 2, sequence: 2 },
  { _id: "stn_grt", code: "GRT", name: "Grant Road", line: "Western", corridor: "Churchgate-Virar", aiStationId: "GRT", location: { lat: 18.9632, lng: 72.8155 }, capacity: 3500, platformCount: 2, sequence: 3 },
  { _id: "stn_mbc", code: "MBC", name: "Mumbai Central", line: "Western", corridor: "Churchgate-Virar", aiStationId: "MBC", location: { lat: 18.9696, lng: 72.8193 }, capacity: 5500, platformCount: 4, sequence: 4 },
  { _id: "stn_ddr_w", code: "DDR-W", name: "Dadar (Western)", line: "Western", corridor: "Churchgate-Virar", aiStationId: "DDR", location: { lat: 19.0178, lng: 72.8431 }, capacity: 9000, platformCount: 5, sequence: 5 },
  { _id: "stn_bnd", code: "BND", name: "Bandra", line: "Western", corridor: "Churchgate-Virar", aiStationId: "BND", location: { lat: 19.0544, lng: 72.8407 }, capacity: 6500, platformCount: 4, sequence: 6 },
  { _id: "stn_and", code: "AND", name: "Andheri", line: "Western", corridor: "Churchgate-Virar", aiStationId: "AND", location: { lat: 19.1197, lng: 72.8464 }, capacity: 8500, platformCount: 5, sequence: 7 },
  { _id: "stn_bvi", code: "BVI", name: "Borivali", line: "Western", corridor: "Churchgate-Virar", aiStationId: "BVI", location: { lat: 19.2307, lng: 72.8567 }, capacity: 7000, platformCount: 6, sequence: 8 },
  { _id: "stn_vr", code: "VR", name: "Virar", line: "Western", corridor: "Churchgate-Virar", aiStationId: "VR", location: { lat: 19.4559, lng: 72.8107 }, capacity: 5000, platformCount: 4, sequence: 9 },

  // Central Line (CSMT - Thane)
  { _id: "stn_csmt", code: "CSMT", name: "CSMT", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9398, lng: 72.8355 }, capacity: 9500, platformCount: 7, sequence: 0 },
  { _id: "stn_by", code: "BY", name: "Byculla", line: "Central", corridor: "CSMT-Thane", location: { lat: 18.9750, lng: 72.8330 }, capacity: 3500, platformCount: 3, sequence: 1 },
  { _id: "stn_ddr_c", code: "DDR-C", name: "Dadar (Central)", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0185, lng: 72.8440 }, capacity: 9500, platformCount: 6, sequence: 2 },
  { _id: "stn_kur", code: "KUR", name: "Kurla", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0726, lng: 72.8845 }, capacity: 7500, platformCount: 5, sequence: 3 },
  { _id: "stn_ghk", code: "GHK", name: "Ghatkopar", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.0864, lng: 72.9081 }, capacity: 6500, platformCount: 4, sequence: 4 },
  { _id: "stn_mum", code: "MUM", name: "Mulund", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1726, lng: 72.9425 }, capacity: 4500, platformCount: 3, sequence: 5 },
  { _id: "stn_thn", code: "THN", name: "Thane", line: "Central", corridor: "CSMT-Thane", location: { lat: 19.1863, lng: 72.9750 }, capacity: 8500, platformCount: 7, sequence: 6 },

  // Central Line (Thane - Kalyan)
  { _id: "stn_klw", code: "KLW", name: "Kalwa", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2003, lng: 72.9781 }, capacity: 3000, platformCount: 2, sequence: 0 },
  { _id: "stn_mbr", code: "MBR", name: "Mumbra", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.1815, lng: 73.0175 }, capacity: 3200, platformCount: 2, sequence: 1 },
  { _id: "stn_diva", code: "DIVA", name: "Diva", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.1937, lng: 73.0287 }, capacity: 2800, platformCount: 3, sequence: 2 },
  { _id: "stn_dom", code: "DOM", name: "Dombivli", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2183, lng: 73.0864 }, capacity: 6500, platformCount: 4, sequence: 3 },
  { _id: "stn_kyn", code: "KYN", name: "Kalyan", line: "Central", corridor: "Thane-Kalyan", location: { lat: 19.2437, lng: 73.1305 }, capacity: 8500, platformCount: 7, sequence: 4 },

  // Central Line (Kasara side)
  { _id: "stn_tit", code: "TIT", name: "Titwala", line: "Central", corridor: "Kalyan-Kasara", location: { lat: 19.2986, lng: 73.1897 }, capacity: 2500, platformCount: 2, sequence: 0 },
  { _id: "stn_ksr", code: "KSR", name: "Kasara", line: "Central", corridor: "Kalyan-Kasara", location: { lat: 19.6103, lng: 73.4870 }, capacity: 2000, platformCount: 2, sequence: 1 },

  // Central Line (Karjat side)
  { _id: "stn_amn", code: "AMN", name: "Ambernath", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 19.1996, lng: 73.1927 }, capacity: 3000, platformCount: 2, sequence: 0 },
  { _id: "stn_bdp", code: "BDP", name: "Badlapur", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 19.1556, lng: 73.2397 }, capacity: 2800, platformCount: 2, sequence: 1 },
  { _id: "stn_kjt", code: "KJT", name: "Karjat", line: "Central", corridor: "Kalyan-Karjat", location: { lat: 18.9107, lng: 73.3236 }, capacity: 2200, platformCount: 3, sequence: 2 },
];

export function getStationDepartures(station: Station): TrainDeparture[] {
  const isWestern = station.line === "Western";
  const now = new Date();
  const baseMinutes = [3, 7, 14, 21];

  return baseMinutes.map((mins, idx) => {
    const depDate = new Date(now.getTime() + mins * 60000);
    const timeStr = depDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

    let destination = isWestern
      ? (idx % 2 === 0 ? "Borivali" : "Virar")
      : (idx % 2 === 0 ? "Kalyan" : "CSMT");
    if (idx === 3) destination = isWestern ? "Andheri AC" : "Kasara Fast";

    const type: "Fast" | "Slow" | "AC Fast" =
      idx === 3 ? "AC Fast" : (idx % 2 === 0 ? "Fast" : "Slow");

    const crowdPercent = Math.min(95, Math.max(30, 40 + (idx * 17) % 55));
    const crowdLevel = crowdPercent >= 80 ? "high" : crowdPercent >= 55 ? "moderate" : "low";

    // Coach distribution (12 cars)
    const coaches = [
      Math.min(95, crowdPercent + 15),
      Math.min(95, crowdPercent + 10),
      Math.max(25, crowdPercent - 15),
      Math.max(20, crowdPercent - 20),
      Math.max(20, crowdPercent - 18),
      crowdPercent,
      crowdPercent + 5,
      Math.max(25, crowdPercent - 10),
      crowdPercent + 8,
      crowdPercent + 12,
      Math.max(30, crowdPercent - 5),
      Math.min(95, crowdPercent + 10),
    ];

    return {
      id: `tr_${station.code}_${idx}`,
      trainNumber: `${isWestern ? "WR" : "CR"}-${90000 + idx * 112}`,
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

export function planJourney(fromStationIdOrCode: string, toStationIdOrCode: string): JourneyPlan | null {
  const from = MUMBAI_STATIONS.find(
    (s) => s._id === fromStationIdOrCode || s.code.toLowerCase() === fromStationIdOrCode.toLowerCase()
  );
  const to = MUMBAI_STATIONS.find(
    (s) => s._id === toStationIdOrCode || s.code.toLowerCase() === toStationIdOrCode.toLowerCase()
  );

  if (!from || !to) return null;

  const sameLine = from.line === to.line;
  const sameCorridor = from.corridor === to.corridor;

  // Station sequence difference calculation
  const seqDiff = Math.abs((to.sequence || 0) - (from.sequence || 0));
  const stopsCount = Math.max(1, seqDiff);
  const distanceKm = Math.round(stopsCount * 3.8);

  const durationFastMin = Math.round(stopsCount * 2.8 + 4);
  const durationSlowMin = Math.round(stopsCount * 4.2 + 6);

  const departures = getStationDepartures(from).map((dep, idx) => ({
    ...dep,
    destination: to.name + (idx % 2 === 0 ? " Fast" : " Slow"),
  }));

  // Find intermediate stations if same line
  const intermediate = MUMBAI_STATIONS.filter((s) => {
    if (s.line !== from.line) return false;
    const minSeq = Math.min(from.sequence, to.sequence);
    const maxSeq = Math.max(from.sequence, to.sequence);
    return s.sequence >= minSeq && s.sequence <= maxSeq;
  }).sort((a, b) => (from.sequence <= to.sequence ? a.sequence - b.sequence : b.sequence - a.sequence));

  let coachRec = "Coaches 4 and 5 (middle of the train) have the lowest crowd density today.";
  if (from.sequence < to.sequence) {
    coachRec = "Towards destination: Middle coaches (4-6) are easiest to board and deboard.";
  }

  const baseFare = Math.max(5, Math.min(30, Math.round(distanceKm * 0.4)));

  return {
    fromStation: from,
    toStation: to,
    sameLine,
    line: from.line,
    corridor: from.corridor,
    distanceKm,
    durationFastMin,
    durationSlowMin,
    intermediateStations: intermediate,
    stopsCount: intermediate.length > 0 ? intermediate.length : stopsCount,
    nextDepartures: departures,
    coachRecommendation: coachRec,
    fareInr: {
      secondClass: baseFare,
      firstClass: baseFare * 10,
      acLocal: baseFare * 12,
    },
  };
}
