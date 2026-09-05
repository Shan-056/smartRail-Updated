"use client";

import { CORRIDOR_LABELS, type Corridor } from "@/lib/network";

const CORRIDORS: Corridor[] = [
  "Churchgate-Virar",
  "CSMT-Thane",
  "Thane-Kalyan",
  "Kalyan-Kasara",
  "Kalyan-Karjat",
  "CSMT-Panvel",
  "Wadala-Goregaon",
  "Thane-Panvel",
];

export default function CorridorFilter({
  active,
  onChange,
}: {
  active: Corridor | "all";
  onChange: (value: Corridor | "all") => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full sm:max-w-3xl no-scrollbar">
      <Chip label="All lines" selected={active === "all"} onClick={() => onChange("all")} />
      {CORRIDORS.map((c) => (
        <Chip key={c} label={CORRIDOR_LABELS[c]} selected={active === c} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        selected
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))]"
      }`}
    >
      {label}
    </button>
  );
}
