"use client";

import { useMemo } from "react";
import { Check, CalendarDays, Plus } from "lucide-react";
import type { Schedule, User } from "@/lib/types";
import { toYMD, weekdayLabel } from "@/lib/date";
import { DIFFICULTY_LABEL } from "@/lib/game";
import { rewardPreview, DIFFICULTY_BAR } from "./reward";

interface Props {
  cursor: Date;
  schedules: Schedule[];
  user: User | null;
  onCompleteSchedule: (s: Schedule) => void;
  onEditSchedule: (s: Schedule) => void;
  onAdd: (ymd: string) => void;
}

interface RowProps {
  schedule: Schedule;
  user: User | null;
  onComplete: (s: Schedule) => void;
  onEdit: (s: Schedule) => void;
}

function ScheduleRow({ schedule, user, onComplete, onEdit }: RowProps) {
  const done = schedule.status === "COMPLETED";
  const { exp, mult } = rewardPreview(schedule.difficulty, user);
  const bar = DIFFICULTY_BAR[schedule.difficulty] ?? "bg-border";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(schedule)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(schedule);
        }
      }}
      className="flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface-2/40 pr-3 transition-colors hover:border-accent/60"
    >
      <span className={`h-full min-h-[2.75rem] w-1 shrink-0 ${done ? "bg-text-2/40" : bar}`} aria-hidden />

      {/* 체크박스 — 완료 토글 */}
      <button
        type="button"
        aria-label={done ? "완료됨" : "완료하기"}
        disabled={done}
        onClick={(e) => {
          e.stopPropagation();
          if (!done) onComplete(schedule);
        }}
        className={`my-2 flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
          done
            ? "border-accent bg-accent text-white"
            : "border-border text-transparent hover:border-success hover:text-success"
        }`}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1 py-2">
        <div className={`truncate text-sm ${done ? "text-text-2 line-through" : "text-text-1"}`}>
          {schedule.title}
        </div>
        <div className="truncate text-[11px] text-text-2">
          난이도 {DIFFICULTY_LABEL[schedule.difficulty]} · 보상 EXP {exp} ×{mult.toFixed(1)}
        </div>
      </div>

      {/* +EXP 배지 */}
      <span className="shrink-0 rounded border border-success/50 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        + {exp} EXP
      </span>
    </div>
  );
}

export default function DayList({
  cursor,
  schedules,
  user,
  onCompleteSchedule,
  onEditSchedule,
  onAdd
}: Props) {
  const ymd = toYMD(cursor);

  const today = useMemo(
    () =>
      schedules
        .filter((s) => toYMD(new Date(s.due_date)) === ymd)
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [schedules, ymd]
  );

  const todo = today.filter((s) => s.status !== "COMPLETED");
  const doneList = today.filter((s) => s.status === "COMPLETED");

  const upcoming = useMemo(
    () =>
      schedules
        .filter((s) => toYMD(new Date(s.due_date)) > ymd && s.status !== "COMPLETED")
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 8),
    [schedules, ymd]
  );

  const countBadge = (n: number) => (
    <span className="rounded border border-border bg-surface-2 px-1.5 text-[11px] text-text-2">
      {n}
    </span>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── TODAY ── */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-surface-2/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-1">
            <CalendarDays className="h-3.5 w-3.5 text-accent" />
            <span>
              TODAY {cursor.getMonth() + 1}/{cursor.getDate()} ({weekdayLabel(cursor.getDay())})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-2">
              {today.length}건
            </span>
            <button
              className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
              onClick={() => onAdd(ymd)}
            >
              <Plus className="h-3 w-3" /> 일정 추가
            </button>
          </div>
        </div>

        <div className="space-y-4 p-3">
          {/* 해야할 일 */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm text-text-1">
              <span className="inline-block h-2 w-2 rounded-full border border-accent" aria-hidden />
              <span>해야할 일</span>
              {countBadge(todo.length)}
            </div>
            {todo.length === 0 ? (
              <p className="pl-3 text-xs text-text-2">남은 일정이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {todo.map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    user={user}
                    onComplete={onCompleteSchedule}
                    onEdit={onEditSchedule}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 마친 일 */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-1.5 text-sm text-text-1">
              <Check className="h-3.5 w-3.5 text-success" />
              <span>마친 일</span>
              {countBadge(doneList.length)}
            </div>
            {doneList.length === 0 ? (
              <p className="pl-3 text-xs text-text-2">아직 완료한 일정이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {doneList.map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    user={user}
                    onComplete={onCompleteSchedule}
                    onEdit={onEditSchedule}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── UPCOMING ── */}
      <div className="h-fit overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/50 px-3 py-2 text-xs font-semibold text-text-1">
          <CalendarDays className="h-3.5 w-3.5 text-accent" />
          <span>UPCOMING 예정</span>
        </div>
        <div className="space-y-2 p-3">
          {upcoming.length === 0 ? (
            <p className="text-xs text-text-2">예정된 일정이 없습니다.</p>
          ) : (
            upcoming.map((s) => (
              <ScheduleRow
                key={s.id}
                schedule={s}
                user={user}
                onComplete={onCompleteSchedule}
                onEdit={onEditSchedule}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
