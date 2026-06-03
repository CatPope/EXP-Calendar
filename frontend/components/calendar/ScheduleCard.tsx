"use client";

import { Check, Pencil } from "lucide-react";
import type { Schedule } from "@/lib/types";
import DifficultyBadge from "@/components/DifficultyBadge";
import { useT } from "@/lib/i18n";

interface Props {
  schedule: Schedule;
  compact?: boolean;
  onComplete?: (s: Schedule) => void;
  onEdit?: (s: Schedule) => void;
  draggable?: boolean;
  onDragStart?: (s: Schedule, e: React.DragEvent) => void;
}

export default function ScheduleCard({
  schedule,
  compact,
  onComplete,
  onEdit,
  draggable,
  onDragStart
}: Props) {
  const t = useT();
  const done = schedule.status === "COMPLETED";
  const overdue = schedule.status === "OVERDUE";
  return (
    <div
      draggable={draggable && !done}
      onDragStart={(e) => onDragStart?.(schedule, e)}
      className={`rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
        done
          ? "bg-success/10 border-success/40 text-text-2 line-through"
          : overdue
          ? "bg-danger/10 border-danger/40"
          : "bg-surface-2 border-border hover:border-accent/60"
      }`}
      title={schedule.title}
      onClick={(e) => {
        e.stopPropagation();
        onEdit?.(schedule);
      }}
    >
      <div className="flex items-center gap-1.5">
        <DifficultyBadge difficulty={schedule.difficulty} />
        <span className="truncate flex-1 text-text-1">{schedule.title}</span>
        {!done && onComplete && (
          <button
            type="button"
            aria-label={t("calendar.complete")}
            className="text-success hover:text-success/80"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(schedule);
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        {!compact && onEdit && (
          <button
            type="button"
            aria-label={t("calendar.edit")}
            className="text-text-2 hover:text-text-1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(schedule);
            }}
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
