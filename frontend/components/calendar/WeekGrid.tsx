"use client";

import { useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import type { Schedule } from "@/lib/types";
import { addDays, isSameDay, toYMD, weekdayLabel } from "@/lib/date";
import ScheduleCard from "./ScheduleCard";

interface Props {
  cursor: Date;
  schedules: Schedule[];
  onSelectDate: (ymd: string) => void;
  onCompleteSchedule: (s: Schedule) => void;
  onEditSchedule: (s: Schedule) => void;
  onDropToDate: (scheduleId: string, ymd: string) => void;
}

function weekStart(d: Date): Date {
  return addDays(d, -d.getDay());
}

// uxui_02: 09:00–18:00 시간대 뷰
const HOURS = Array.from({ length: 10 }, (_, i) => i + 9);

export default function WeekGrid({
  cursor,
  schedules,
  onSelectDate,
  onCompleteSchedule,
  onEditSchedule,
  onDropToDate
}: Props) {
  const days = useMemo(() => {
    const s = weekStart(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [cursor]);

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
  }
  function onDrop(ymd: string, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onDropToDate(id, ymd);
  }

  const today = new Date();
  const first = days[0];
  const last = days[6];
  const rangeLabel = `${first.getMonth() + 1}/${first.getDate()} – ${
    last.getMonth() + 1
  }/${last.getDate()}`;

  /** 09시 이전은 09:00 줄에, 18시 이후는 18:00 줄에 모은다. */
  function bucket(hour: number): number {
    if (hour < 9) return 9;
    if (hour > 18) return 18;
    return hour;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {/* 섹션 헤더 — uxui_02: WEEK 주간 타임라인 · 날짜 범위 */}
      <div className="flex items-center justify-between border-b border-border bg-surface-2/50 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-1">
          <LayoutGrid className="h-3.5 w-3.5 text-accent" />
          <span>WEEK 주간 타임라인 (7일 · 시간대 뷰)</span>
        </div>
        <span className="text-[11px] text-text-2">{rangeLabel}</span>
      </div>

      {/* 요일 + 날짜 헤더 */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border text-xs">
        <div />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={toYMD(d)}
              className={`px-2 py-1.5 text-center ${
                isToday
                  ? "font-bold text-accent"
                  : i === 0
                  ? "text-danger"
                  : i === 6
                  ? "text-accent"
                  : "text-text-2"
              }`}
            >
              <div>{weekdayLabel(i)}</div>
              <div className="flex items-center justify-center gap-0.5">
                {isToday && <span aria-hidden>&#9654;</span>}
                <span>{d.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="max-h-[600px] overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((h) => (
            <div key={`hour-${h}`} className="contents">
              <div className="border-b border-r border-border/50 px-2 py-1 text-right text-[10px] text-text-2">
                {String(h).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const key = toYMD(d);
                const list = (byDate[key] || []).filter(
                  (s) => bucket(new Date(s.due_date).getHours()) === h
                );
                return (
                  <button
                    type="button"
                    key={`${key}-${h}`}
                    onClick={() => onSelectDate(key)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(key, e)}
                    className="min-h-[48px] border-b border-r border-border/50 p-0.5 text-left last:border-r-0 hover:bg-surface-2/60"
                  >
                    <div className="space-y-1">
                      {list.map((s) => (
                        <ScheduleCard
                          key={s.id}
                          schedule={s}
                          showDifficulty
                          draggable
                          onDragStart={onDragStart}
                          onComplete={onCompleteSchedule}
                          onEdit={onEditSchedule}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
