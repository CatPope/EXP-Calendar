"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
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

  const byDate = useMemo(() => {
    const m: Record<string, Schedule[]> = {};
    for (const s of schedules) {
      const key = toYMD(new Date(s.due_date));
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
      {/* 섹션 헤더 — uxui_01: MONTH 월간 뷰 · 드래그하여 일정 이동 */}
      <div className="flex items-center justify-between border-b border-border bg-surface-2/50 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-1">
          <CalendarDays className="h-3.5 w-3.5 text-accent" />
          <span>MONTH 월간 뷰</span>
        </div>
        <span className="text-[11px] text-text-2">드래그하여 일정 이동</span>
      </div>

      <div className="grid grid-cols-7 border-b border-border text-xs">
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

      <div className="grid min-h-[480px] grid-cols-7 grid-rows-6">
        {cells.map((d) => {
          const key = toYMD(d);
          const list = byDate[key] || [];
          const muted = !isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const dow = d.getDay();
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(key)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(key, e)}
              className={`align-top text-left transition-colors last:border-r-0 border-b border-r border-border p-1 hover:bg-surface-2/60 md:p-1.5 ${
                muted ? "bg-base/50 opacity-60" : ""
              }`}
            >
              <div
                className={`mb-1 flex items-center gap-0.5 text-[11px] ${
                  isToday
                    ? "font-bold text-accent"
                    : dow === 0
                    ? "text-danger"
                    : dow === 6
                    ? "text-accent"
                    : "text-text-2"
                }`}
              >
                {isToday && <span aria-hidden>&#9654;</span>}
                <span>{d.getDate()}</span>
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
