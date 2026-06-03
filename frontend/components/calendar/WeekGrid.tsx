"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Schedule } from "@/lib/types";
import { addDays, isSameDay, toYMD } from "@/lib/date";
import { useT } from "@/lib/i18n";
import ScheduleCard from "./ScheduleCard";

// Hour convention for onSelectRange:
//   startHour = first covered hour (0-based, 0-23)
//   endHour   = EXCLUSIVE end hour = last covered hour + 1
// Example: drag across hour-rows 3, 4, 5, 6  →  startHour=3, endHour=7
// This means the selected block is [startHour:00 – endHour:00].

interface DragCell {
  dayYmd: string;
  hour: number;
}

interface Props {
  cursor: Date;
  schedules: Schedule[];
  onSelectDate: (ymd: string) => void;
  /** Called when user drags across cells in a single column.
   *  startHour inclusive, endHour exclusive (== last_covered_hour + 1). */
  onSelectRange?: (ymd: string, startHour: number, endHour: number) => void;
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
  onSelectRange,
  onCompleteSchedule,
  onEditSchedule,
  onDropToDate
}: Props) {
  const t = useT();
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

  // ---- HTML5 card-drag handlers (existing move logic) ----
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

  // ---- Mouse drag-to-select-range state ----
  // We track the drag anchor and the current hover cell.
  // A "drag" is distinguished from a plain click by whether the mouse moved
  // to a different hour row than where it started.
  const [dragAnchor, setDragAnchor] = useState<DragCell | null>(null);
  const [dragCurrent, setDragCurrent] = useState<DragCell | null>(null);
  // isDragging becomes true once the pointer moves to a different hour.
  const isDragging = useRef(false);

  // Compute the highlighted range (null when no active drag).
  const highlight = useMemo<{ ymd: string; minH: number; maxH: number } | null>(() => {
    if (!dragAnchor || !dragCurrent) return null;
    if (dragAnchor.dayYmd !== dragCurrent.dayYmd) return null;
    const minH = Math.min(dragAnchor.hour, dragCurrent.hour);
    const maxH = Math.max(dragAnchor.hour, dragCurrent.hour);
    return { ymd: dragAnchor.dayYmd, minH, maxH };
  }, [dragAnchor, dragCurrent]);

  function isCellHighlighted(ymd: string, hour: number): boolean {
    if (!highlight) return false;
    return highlight.ymd === ymd && hour >= highlight.minH && hour <= highlight.maxH;
  }

  // Global mouseup cleans up drag state and fires the callback.
  const finalizeDrag = useCallback(() => {
    if (dragAnchor && dragCurrent && isDragging.current) {
      // Only fire if same column; cross-column drags are ignored.
      if (dragAnchor.dayYmd === dragCurrent.dayYmd) {
        const startHour = Math.min(dragAnchor.hour, dragCurrent.hour);
        // endHour is exclusive: last covered hour + 1.
        const endHour = Math.max(dragAnchor.hour, dragCurrent.hour) + 1;
        if (onSelectRange) {
          onSelectRange(dragAnchor.dayYmd, startHour, endHour);
        } else {
          onSelectDate(dragAnchor.dayYmd);
        }
      }
    }
    setDragAnchor(null);
    setDragCurrent(null);
    isDragging.current = false;
  }, [dragAnchor, dragCurrent, onSelectRange, onSelectDate]);

  useEffect(() => {
    window.addEventListener("mouseup", finalizeDrag);
    return () => window.removeEventListener("mouseup", finalizeDrag);
  }, [finalizeDrag]);

  function handleCellMouseDown(ymd: string, hour: number, e: React.MouseEvent) {
    // Only primary button; ignore if a card drag is in progress.
    if (e.button !== 0) return;
    e.preventDefault(); // prevent text selection during drag
    isDragging.current = false;
    setDragAnchor({ dayYmd: ymd, hour });
    setDragCurrent({ dayYmd: ymd, hour });
  }

  function handleCellMouseEnter(ymd: string, hour: number) {
    if (!dragAnchor) return;
    setDragCurrent({ dayYmd: ymd, hour });
    if (ymd !== dragAnchor.dayYmd || hour !== dragAnchor.hour) {
      isDragging.current = true;
    }
  }

  function handleCellClick(ymd: string, hour: number) {
    // If a range drag just completed, finalizeDrag() already handled it on mouseup.
    // This click fires for a plain click (no movement). Route through onSelectRange
    // as a 1-hour slot (startHour=hour, endHour=hour+1), or fall back to onSelectDate.
    if (isDragging.current) return; // swallowed by drag
    if (onSelectRange) {
      onSelectRange(ymd, hour, hour + 1);
    } else {
      onSelectDate(ymd);
    }
  }

  const today = new Date();

  return (
    <div
      className="rounded-lg border border-border bg-surface overflow-hidden select-none"
      onMouseLeave={() => {
        // If mouse leaves the grid entirely without a mouseup, finalize.
        if (dragAnchor) {
          finalizeDrag();
        }
      }}
    >
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
              <div>{t(`calendar.weekday${i}`)}</div>
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
                const highlighted = isCellHighlighted(key, h);
                return (
                  <button
                    type="button"
                    key={`${key}-${h}`}
                    // Use click only for plain-click (no-drag) case; drag finalized via mouseup.
                    onClick={() => handleCellClick(key, h)}
                    onMouseDown={(e) => handleCellMouseDown(key, h, e)}
                    onMouseEnter={() => handleCellMouseEnter(key, h)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(key, e)}
                    className={`text-left min-h-[40px] border-b border-r border-border/50 last:border-r-0 p-0.5 transition-colors ${
                      highlighted
                        ? "bg-accent/20 border-accent/40"
                        : "hover:bg-surface-2/60"
                    }`}
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
