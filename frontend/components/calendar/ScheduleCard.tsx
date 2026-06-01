"use client";

import { Check, Pencil } from "lucide-react";
import type { Schedule } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/game";
import { DIFFICULTY_BAR } from "./reward";

interface Props {
  schedule: Schedule;
  /** chip-style (month grid): single-line title only. */
  compact?: boolean;
  /** show "난이도 X" subtitle under the title (week timeline blocks). */
  showDifficulty?: boolean;
  onComplete?: (s: Schedule) => void;
  onEdit?: (s: Schedule) => void;
  draggable?: boolean;
  onDragStart?: (s: Schedule, e: React.DragEvent) => void;
}

export default function ScheduleCard({
  schedule,
  compact,
  showDifficulty,
  onComplete,
  onEdit,
  draggable,
  onDragStart
}: Props) {
  const done = schedule.status === "COMPLETED";
  const overdue = schedule.status === "OVERDUE";
  const bar = DIFFICULTY_BAR[schedule.difficulty] ?? "bg-border";

  return (
    <div
      draggable={draggable && !done}
      onDragStart={(e) => onDragStart?.(schedule, e)}
      className={`group relative flex overflow-hidden rounded-md border text-xs transition-colors ${
        draggable && !done ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        done
          ? "border-border/60 bg-surface-2/40 opacity-60"
          : overdue
          ? "border-danger/40 bg-danger/10"
          : "border-border bg-surface-2 hover:border-accent/60"
      }`}
      title={schedule.title}
      onClick={(e) => {
        e.stopPropagation();
        onEdit?.(schedule);
      }}
    >
      {/* 좌측 난이도 색 바 — uxui_01/02/03 공통 */}
      <span className={`w-1 shrink-0 ${done ? "bg-text-2/40" : bar}`} aria-hidden />

      <div className="min-w-0 flex-1 px-1.5 py-1">
        <div className="flex items-center gap-1">
          {done && <Check className="h-3 w-3 shrink-0 text-text-2" aria-hidden />}
          <span
            className={`flex-1 truncate ${
              done ? "text-text-2 line-through" : "text-text-1"
            }`}
          >
            {schedule.title}
          </span>
          {!done && onComplete && (
            <button
              type="button"
              aria-label="완료"
              className="shrink-0 text-success opacity-0 transition-opacity hover:text-success/80 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onComplete(schedule);
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          {!compact && !showDifficulty && onEdit && (
            <button
              type="button"
              aria-label="수정"
              className="shrink-0 text-text-2 hover:text-text-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(schedule);
              }}
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        {showDifficulty && (
          <div className="truncate text-[10px] text-text-2">
            난이도 {DIFFICULTY_LABEL[schedule.difficulty]}
          </div>
        )}
      </div>
    </div>
  );
}
