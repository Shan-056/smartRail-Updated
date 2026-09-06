"use client";

import { LINE_COLORS, type Corridor, type Line } from "@/lib/network";

export interface LineOption {
  id: Line | "all";
  label: string;
  color?: string;
  corridors?: { id: Corridor; label: string }[];
}

const LINES: LineOption[] = [
  { id: "all", label: "All Lines" },
  {
    id: "Western",
    label: "Western Line",
    color: LINE_COLORS.Western,
    corridors: [{ id: "Churchgate-Virar", label: "Churchgate ⇄ Virar" }],
  },
  {
    id: "Central",
    label: "Central Line",
    color: LINE_COLORS.Central,
    corridors: [
      { id: "CSMT-Thane", label: "CSMT ⇄ Thane" },
      { id: "Thane-Kalyan", label: "Thane ⇄ Kalyan" },
      { id: "Kalyan-Kasara", label: "Kasara Branch" },
      { id: "Kalyan-Karjat", label: "Karjat Branch" },
    ],
  },
  {
    id: "Harbour",
    label: "Harbour Line",
    color: LINE_COLORS.Harbour,
    corridors: [
      { id: "CSMT-Panvel", label: "CSMT ⇄ Panvel" },
      { id: "Wadala-Goregaon", label: "Wadala ⇄ Goregaon" },
    ],
  },
  {
    id: "Trans-Harbour",
    label: "Trans-Harbour Line",
    color: LINE_COLORS["Trans-Harbour"],
    corridors: [{ id: "Thane-Panvel", label: "Thane ⇄ Panvel" }],
  },
];

interface CorridorFilterProps {
  activeLine: Line | "all";
  activeCorridor: Corridor | "all";
  onLineChange: (line: Line | "all") => void;
  onCorridorChange: (corridor: Corridor | "all") => void;
}

export default function CorridorFilter({
  activeLine,
  activeCorridor,
  onLineChange,
  onCorridorChange,
}: CorridorFilterProps) {
  const currentLineObj = LINES.find((l) => l.id === activeLine);
  const showSubCorridors =
    currentLineObj &&
    currentLineObj.id !== "all" &&
    currentLineObj.corridors &&
    currentLineObj.corridors.length > 1;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Primary Line Selection Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
        {LINES.map((line) => {
          const isSelected = activeLine === line.id;
          return (
            <button
              key={line.id}
              onClick={() => {
                onLineChange(line.id);
                onCorridorChange("all");
              }}
              className={`group flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                isSelected
                  ? "border-brand-600 bg-brand-600 text-white shadow-xs"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
              }`}
            >
              {line.color && (
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: line.color }}
                />
              )}
              <span>{line.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-branch pills when a multi-branch line like Central or Harbour is selected */}
      {showSubCorridors && (
        <div className="flex items-center gap-1.5 overflow-x-auto pl-1 text-[11px] animate-in fade-in duration-150">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
            Section:
          </span>
          <button
            onClick={() => onCorridorChange("all")}
            className={`shrink-0 rounded-md px-2 py-0.5 font-medium transition ${
              activeCorridor === "all"
                ? "bg-brand-600/15 text-brand-600 dark:text-brand-400 font-bold"
                : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))]"
            }`}
          >
            All {currentLineObj.label}
          </button>
          {currentLineObj.corridors!.map((c) => (
            <button
              key={c.id}
              onClick={() => onCorridorChange(c.id)}
              className={`shrink-0 rounded-md px-2 py-0.5 font-medium transition ${
                activeCorridor === c.id
                  ? "bg-brand-600/15 text-brand-600 dark:text-brand-400 font-bold"
                  : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
