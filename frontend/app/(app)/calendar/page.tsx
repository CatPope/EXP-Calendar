"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import MonthGrid from "@/components/calendar/MonthGrid";
import WeekGrid from "@/components/calendar/WeekGrid";
import DayList from "@/components/calendar/DayList";
import ScheduleModal from "@/components/calendar/ScheduleModal";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import {
  addDays,
  addMonths,
  endOfMonth,
  fromYMD,
  startOfMonth,
  toYMD,
  ymdToDueIso,
  formatMonthHeader
} from "@/lib/date";
import type { Schedule } from "@/lib/types";

type View = "month" | "week" | "day";

export default function CalendarPage() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  // Local overlay for optimistic mutations on top of the fetched list.
  const [overrides, setOverrides] = useState<Schedule[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [prefillYmd, setPrefillYmd] = useState<string | undefined>();

  const pushToast = useAppStore((s) => s.pushToast);
  const showReward = useAppStore((s) => s.showReward);
  const user = useAppStore((s) => s.user);

  const range = useMemo(() => {
    if (view === "month") {
      const first = startOfMonth(cursor);
      const last = endOfMonth(cursor);
      // include surrounding cells so month grid is complete
      return { from: toYMD(addDays(first, -7)), to: toYMD(addDays(last, 7)) };
    }
    if (view === "week") {
      const start = addDays(cursor, -cursor.getDay());
      return { from: toYMD(start), to: toYMD(addDays(start, 6)) };
    }
    // day view: fetch today + 30 days ahead so UPCOMING (uxui_03) has data
    return { from: toYMD(cursor), to: toYMD(addDays(cursor, 30)) };
  }, [view, cursor]);

  const {
    data,
    loading,
    error: err,
    reload,
    dismissError
  } = useAsyncData<Schedule[]>(
    () => Api.listSchedules(range.from, range.to),
    [range.from, range.to]
  );

  // Reset optimistic overlay whenever the underlying query changes.
  useEffect(() => {
    setOverrides(null);
  }, [data]);

  const schedules = overrides ?? data ?? [];
  function patchLocal(updater: (arr: Schedule[]) => Schedule[]) {
    setOverrides((cur) => updater(cur ?? data ?? []));
  }

  function shift(n: number) {
    if (view === "month") setCursor(addMonths(cursor, n));
    else if (view === "week") setCursor(addDays(cursor, 7 * n));
    else setCursor(addDays(cursor, n));
  }

  const onSelectDate = (ymd: string) => {
    if (view === "month" || view === "week") {
      setPrefillYmd(ymd);
      setEditing(null);
      setModalOpen(true);
    } else {
      setCursor(fromYMD(ymd));
    }
  };

  const onEditSchedule = (s: Schedule) => {
    setEditing(s);
    setPrefillYmd(undefined);
    setModalOpen(true);
  };

  const onCompleteSchedule = async (s: Schedule) => {
    try {
      const { schedule: updated, reward } = await Api.completeSchedule(s.id);
      patchLocal((arr) => arr.map((x) => (x.id === updated.id ? updated : x)));
      showReward(reward);
      // Refresh user from server to keep HUD consistent.
      try {
        const me = await Api.me();
        useAppStore.getState().setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  };

  const onUncompleteSchedule = async (s: Schedule) => {
    try {
      const { schedule: updated } = await Api.uncompleteSchedule(s.id);
      patchLocal((arr) => arr.map((x) => (x.id === updated.id ? updated : x)));
      pushToast("success", "완료를 취소하고 보상을 회수했습니다.");
      try {
        const me = await Api.me();
        useAppStore.getState().setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  };

  const onDropToDate = async (id: string, ymd: string) => {
    const s = schedules.find((x) => x.id === id);
    if (!s) return;
    if (toYMD(new Date(s.due_date)) === ymd) return;
    try {
      const updated = await Api.patchSchedule(id, { due_date: ymdToDueIso(ymd) });
      patchLocal((arr) => arr.map((x) => (x.id === id ? updated : x)));
      pushToast("success", "일정 날짜를 변경했습니다.");
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 — uxui_01/02/03: 큰 월 타이틀 + 부제 / 우측 뷰 토글 + 일정 추가 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-1">
            {formatMonthHeader(cursor)}
          </h1>
          <p className="mt-0.5 text-sm text-text-2">
            오늘 일정을 완료하고 EXP를 획득하세요 · Google Calendar 연동
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="btn-ghost px-2 py-1.5"
            aria-label="이전"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="btn-ghost px-2 py-1.5 text-xs"
          >
            오늘
          </button>
          <button
            onClick={() => shift(1)}
            className="btn-ghost px-2 py-1.5"
            aria-label="다음"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* 월/주/일 세그먼트 토글 */}
          <div className="flex items-center gap-1 rounded-md bg-surface-2 p-1">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  view === v
                    ? "bg-accent text-white"
                    : "text-text-2 hover:text-text-1"
                }`}
              >
                {v === "month" ? "월" : v === "week" ? "주" : "일"}
              </button>
            ))}
          </div>

          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={() => {
              setEditing(null);
              setPrefillYmd(toYMD(cursor));
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> 일정 추가
          </button>
        </div>
      </div>

      {err && <ErrorBanner message={err} onDismiss={dismissError} />}

      {loading ? (
        <Spinner block label="일정 불러오는 중..." />
      ) : view === "month" ? (
        <MonthGrid
          cursor={cursor}
          schedules={schedules}
          onSelectDate={onSelectDate}
          onCompleteSchedule={onCompleteSchedule}
          onEditSchedule={onEditSchedule}
          onDropToDate={onDropToDate}
        />
      ) : view === "week" ? (
        <WeekGrid
          cursor={cursor}
          schedules={schedules}
          onSelectDate={onSelectDate}
          onCompleteSchedule={onCompleteSchedule}
          onEditSchedule={onEditSchedule}
          onDropToDate={onDropToDate}
        />
      ) : (
        <DayList
          cursor={cursor}
          schedules={schedules}
          user={user}
          onCompleteSchedule={onCompleteSchedule}
          onEditSchedule={onEditSchedule}
          onAdd={(ymd) => {
            setEditing(null);
            setPrefillYmd(ymd);
            setModalOpen(true);
          }}
        />
      )}

      <ScheduleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dateYmd={prefillYmd}
        schedule={editing}
        onSaved={reload}
        onComplete={onCompleteSchedule}
        onUncomplete={onUncompleteSchedule}
      />
    </div>
  );
}
