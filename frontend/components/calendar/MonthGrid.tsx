"use client";

import { useMemo } from "react";
import type { Schedule } from "@/lib/types";
import {
  isSameDay,
  isSameMonth,
  monthGrid,
  toYMD,
  weekdayLabel
} from "@/lib/date";
import ScheduleCard from "./ScheduleCard";

interface Props {
  cursor: Date;
  schedules: Schedule[];
  onSelectDate: (ymd: string) => void;
  onCompleteSchedule: (s: Schedule) => void;
  onEditSchedule: (s: Schedule) => void;
  onDropToDate: (scheduleId: string, ymd: string) => void;
}

export default function MonthGrid({
  cursor,
  schedules,
  onSelectDate,
  onCompleteSchedule,
  onEditSchedule,
  onDropToDate
}: Props) {
  const cells = useMemo(() => monthGrid(cursor), [cursor]);
  const today = new Date();

  // group schedules by YMD
  const byDate = useMemo(() => {
    const m: Record<string, Schedule[]> = {};
    for (const s of schedules) {
      const d = new Date(s.due_date);
      const key = toYMD(d);
      (m[key] = m[key] || []).push(s);
    }
    return m;
  }, [schedules]);

  function onDragStart(s: Schedule, e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", s.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(ymd: string, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onDropToDate(id, ymd);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-7 border-b border-border bg-surface-2/50 text-xs">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`px-2 py-1.5 text-center font-medium ${
              i === 0 ? "text-danger" : i === 6 ? "text-accent" : "text-text-2"
            }`}
          >
            {weekdayLabel(i)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 min-h-[480px]">
        {cells.map((d) => {
          const key = toYMD(d);
          const list = byDate[key] || [];
          const muted = !isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(key)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(key, e)}
              className={`text-left border-r border-b border-border last:border-r-0 p-1 md:p-1.5 align-top hover:bg-surface-2/60 transition-colors ${
                muted ? "bg-base/50 opacity-60" : ""
              }`}
            >
              <div
                className={`flex items-center justify-between mb-1 text-[11px] ${
                  isToday ? "text-accent font-bold" : "text-text-2"
                }`}
              >
                <span>{d.getDate()}</span>
                {isToday && (
                  <span className="text-[9px] rounded bg-accent/20 px-1 text-accent">
                    오늘
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {list.slice(0, 3).map((s) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    compact
                    draggable
                    onDragStart={onDragStart}
                    onComplete={onCompleteSchedule}
                    onEdit={onEditSchedule}
                  />
                ))}
                {list.length > 3 && (
                  <div className="text-[10px] text-text-2">
                    +{list.length - 3} 더보기
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
