"use client";

import { Station } from "@/lib/network";
import CrowdCard from "./CrowdCard";
import EtaCard from "./EtaCard";
import CongestionCard from "./CongestionCard";

interface PredictionsViewProps {
  station: Station;
}

export default function PredictionsView({ station }: PredictionsViewProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
            Digital Twin & ML Predictions
          </h3>
        </div>
        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400">
          15-Min Twin Engine
        </span>
      </div>

      {/* Accordion prediction cards */}
      <CrowdCard stationId={station._id} />
      <EtaCard stationId={station._id} />
      <CongestionCard stationId={station._id} />
    </div>
  );
}
