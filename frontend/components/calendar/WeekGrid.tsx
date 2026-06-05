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

  // 같은 날짜의 일정을 모은다. due_date 의 (날짜 부분)을 기준으로 그룹화.
  // 시간 슬롯 배치는 byDate 가 아니라 아래의 bucketHourFor() 가 결정한다.
  const byDate = useMemo(() => {
    const m: Record<string, Schedule[]> = {};
    for (const s of schedules) {
      const d = new Date(s.due_date);
      const key = toYMD(d);
      (m[key] = m[key] || []).push(s);
    }
    return m;
  }, [schedules]);

  // 일정의 시간 슬롯을 결정한다.
  //  - start_time 이 있으면 그 시각의 hour 슬롯에 배치 (정확한 시간 범위 반영).
  //  - start_time 이 없으면 "종일" 슬롯으로 (due_date 의 23:59 기본값 때문에
  //    모든 일정이 23시 행에 몰리던 버그를 막는다).
  // null → all-day row.
  function bucketHourFor(s: Schedule): number | null {
    if (s.start_time) {
      return new Date(s.start_time).getHours();
    }
    return null;
  }

  // 시간 범위 라벨 ("HH:MM" 또는 "HH:MM–HH:MM"). 없으면 빈 문자열.
  function timeRangeLabel(s: Schedule): string {
    if (!s.start_time) return "";
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const start = fmt(s.start_time);
    if (!s.end_time) return start;
    return `${start}–${fmt(s.end_time)}`;
  }

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
          {/* 종일(시작 시간 미설정) 행 — due_date 만 있는 일정은 여기 표시 */}
          <div className="border-b border-border bg-surface-2/30 px-2 py-1 text-[10px] text-text-2 text-right">
            {t("calendar.allDay")}
          </div>
          {days.map((d) => {
            const key = toYMD(d);
            const allDay = (byDate[key] || []).filter(
              (s) => bucketHourFor(s) === null
            );
            return (
              <div
                key={`allday-${key}`}
                className="min-h-[36px] border-b border-r border-border/50 last:border-r-0 bg-surface-2/30 p-0.5"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(key, e)}
              >
                <div className="space-y-1">
                  {allDay.map((s) => (
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
              </div>
            );
          })}

          {HOURS.map((h) => (
            <div key={`hour-${h}`} className="contents">
              <div className="border-b border-border/50 px-2 py-1 text-[10px] text-text-2 text-right">
                {String(h).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const key = toYMD(d);
                const list = (byDate[key] || []).filter(
                  (s) => bucketHourFor(s) === h
                );
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
                      {list.map((s) => {
                        const range = timeRangeLabel(s);
                        return (
                          <div key={s.id} className="space-y-0.5">
                            {range && (
                              <div className="text-[9px] text-text-2 px-1 leading-none tabular-nums">
                                {range}
                              </div>
                            )}
                            <ScheduleCard
                              schedule={s}
                              compact
                              draggable
                              onDragStart={onDragStart}
                              onComplete={onCompleteSchedule}
                              onEdit={onEditSchedule}
                            />
                          </div>
                        );
                      })}
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
