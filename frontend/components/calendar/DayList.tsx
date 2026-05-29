"use client";

import { useMemo } from "react";
import type { Schedule } from "@/lib/types";
import { toYMD } from "@/lib/date";
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
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월 {cursor.getDate()}일
        </h3>
        <button className="btn-ghost text-xs" onClick={() => onAdd(ymd)}>
          + 일정 추가
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-text-2">등록된 일정이 없습니다.</p>
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
