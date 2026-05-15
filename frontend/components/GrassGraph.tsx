"use client";

import { addDays, toYMD } from "@/lib/date";

interface Props {
  data: Record<string, number>;
  days?: number;
}

const LEVELS = [
  "bg-surface-2",
  "bg-success/30",
  "bg-success/50",
  "bg-success/70",
  "bg-success"
];

function bucket(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export default function GrassGraph({ data, days = 365 }: Props) {
  // align end of week to today; start = today - (days-1)
  const end = new Date();
  // We render 53 weeks * 7 days = 371 cells, starting at Sunday before (today - days)
  const start = addDays(end, -days + 1);
  const startSun = addDays(start, -start.getDay());
  const totalCells = 53 * 7;

  const cells: { ymd: string; count: number; inRange: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = addDays(startSun, i);
    const ymd = toYMD(d);
    const count = data[ymd] || 0;
    const inRange = d >= start && d <= end;
    cells.push({ ymd, count, inRange });
  }

  // Render as columns (weeks)
  const weeks: typeof cells[] = [];
  for (let w = 0; w < 53; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((c) => (
              <div
                key={c.ymd}
                title={`${c.ymd}: ${c.count}건 완료`}
                className={`w-3 h-3 rounded-sm ${LEVELS[bucket(c.count)]} ${
                  !c.inRange ? "opacity-30" : ""
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-text-2 mt-2">
        <span>적음</span>
        {LEVELS.map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}
