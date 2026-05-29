"use client";

import { useMemo } from "react";
import type { Schedule } from "@/lib/types";
import {
  addDays,
  isSameDay,
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

function weekStart(d: Date): Date {
  return addDays(d, -d.getDay());
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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
  }
  function onDrop(ymd: string, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onDropToDate(id, ymd);
  }

  const today = new Date();

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-surface-2/50 text-xs">
        <div />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={toYMD(d)}
              className={`px-2 py-1.5 text-center ${
                isToday ? "text-accent font-bold" : "text-text-2"
              }`}
            >
              <div>{weekdayLabel(i)}</div>
              <div>{d.getMonth() + 1}/{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="max-h-[600px] overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {HOURS.map((h) => (
            <div key={`hour-${h}`} className="contents">
              <div className="border-b border-border/50 px-2 py-1 text-[10px] text-text-2 text-right">
                {String(h).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const key = toYMD(d);
                const list = (byDate[key] || []).filter((s) => {
                  const dt = new Date(s.due_date);
                  return dt.getHours() === h;
                });
                return (
                  <button
                    type="button"
                    key={`${key}-${h}`}
                    onClick={() => onSelectDate(key)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(key, e)}
                    className="text-left min-h-[40px] border-b border-r border-border/50 last:border-r-0 p-0.5 hover:bg-surface-2/60"
                  >
                    <div className="space-y-1">
                      {list.map((s) => (
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
