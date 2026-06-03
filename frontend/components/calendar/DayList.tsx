"use client";

import { useMemo } from "react";
import type { Schedule } from "@/lib/types";
import { toYMD } from "@/lib/date";
import { useT } from "@/lib/i18n";
import ScheduleCard from "./ScheduleCard";

interface Props {
  cursor: Date;
  schedules: Schedule[];
  onCompleteSchedule: (s: Schedule) => void;
  onEditSchedule: (s: Schedule) => void;
  onAdd: (ymd: string) => void;
}

export default function DayList({
  cursor,
  schedules,
  onCompleteSchedule,
  onEditSchedule,
  onAdd
}: Props) {
  const t = useT();
  const ymd = toYMD(cursor);
  const list = useMemo(() => {
    return schedules
      .filter((s) => toYMD(new Date(s.due_date)) === ymd)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [schedules, ymd]);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {t("calendar.dayHeader", {
            year: cursor.getFullYear(),
            month: cursor.getMonth() + 1,
            day: cursor.getDate()
          })}
        </h3>
        <button className="btn-ghost text-xs" onClick={() => onAdd(ymd)}>
          {t("calendar.addSchedule")}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-text-2">{t("calendar.noSchedules")}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}>
              <ScheduleCard
                schedule={s}
                onComplete={onCompleteSchedule}
                onEdit={onEditSchedule}
              />
              {s.description && (
                <p className="text-xs text-text-2 mt-1 pl-1 whitespace-pre-line">
                  {s.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
