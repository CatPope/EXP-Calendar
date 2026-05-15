"use client";

import { monthGrid, isSameMonth, isSameDay, toYMD, weekdayLabel } from "@/lib/date";
import type { Schedule } from "@/lib/types";

interface Props {
  month: Date;
  schedules: Schedule[];
  selectedYmd: string;
  onSelect: (ymd: string) => void;
  onMoveSchedule?: (scheduleId: string, targetYmd: string) => void;
}

export default function CalendarGrid({ month, schedules, selectedYmd, onSelect, onMoveSchedule }: Props) {
  const cells = monthGrid(month);
  const today = new Date();

  const byDay = new Map<string, Schedule[]>();
  for (const s of schedules) {
    const ymd = s.due_date.slice(0, 10);
    if (!byDay.has(ymd)) byDay.set(ymd, []);
    byDay.get(ymd)!.push(s);
  }

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/schedule-id", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("text/schedule-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }
  function onDrop(e: React.DragEvent, ymd: string) {
    const id = e.dataTransfer.getData("text/schedule-id");
    if (id && onMoveSchedule) onMoveSchedule(id, ymd);
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-surface-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`p-2 text-center text-xs font-semibold ${
              i === 0 ? "text-danger" : i === 6 ? "text-accent" : "text-text-2"
            }`}
          >
            {weekdayLabel(i)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const ymd = toYMD(d);
          const inMonth = isSameMonth(d, month);
          const isToday = isSameDay(d, today);
          const isSelected = ymd === selectedYmd;
          const items = byDay.get(ymd) || [];
          const completed = items.filter((s) => s.status === "COMPLETED").length;
          const overdue = items.filter((s) => s.status === "OVERDUE").length;

          return (
            <button
              key={ymd}
              onClick={() => onSelect(ymd)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, ymd)}
              className={`text-left min-h-[88px] sm:min-h-[100px] p-1.5 border-t border-r border-border transition-colors ${
                inMonth ? "bg-surface" : "bg-base/40 text-text-2/60"
              } ${isSelected ? "ring-2 ring-accent ring-inset" : ""} hover:bg-surface-2`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono ${
                    isToday
                      ? "bg-accent text-white rounded-full w-5 h-5 inline-flex items-center justify-center"
                      : d.getDay() === 0
                      ? "text-danger"
                      : d.getDay() === 6
                      ? "text-accent"
                      : "text-text-1"
                  }`}
                >
                  {d.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="text-[10px] text-text-2 font-mono">
                    {completed}/{items.length}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {items.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, s.id)}
                    className={`truncate text-[11px] rounded px-1 py-0.5 cursor-grab active:cursor-grabbing ${
                      s.status === "COMPLETED"
                        ? "bg-success/15 text-success line-through"
                        : s.status === "OVERDUE"
                        ? "bg-danger/15 text-danger"
                        : "bg-accent/15 text-accent"
                    }`}
                    title={s.title}
                  >
                    {s.title}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-text-2">+{items.length - 3} 더보기</div>
                )}
                {overdue > 0 && (
                  <div className="text-[10px] text-danger">지연 {overdue}건</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
