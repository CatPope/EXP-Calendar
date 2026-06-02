"use client";

import { useState } from "react";
import { BarChart3, Flame, Trophy, TrendingUp } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import GrassGraph from "@/components/GrassGraph";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { StatsSummary, SeriesPoint } from "@/lib/types";

const GRADES = ["D", "C", "B", "A", "S"] as const;

function gradeIndex(grade: string): number {
  const i = GRADES.indexOf(grade?.toUpperCase() as (typeof GRADES)[number]);
  return i < 0 ? 0 : i;
}

const PERIODS: { key: "week" | "month" | "year"; label: string }[] = [
  { key: "week", label: "주" },
  { key: "month", label: "월" },
  { key: "year", label: "연" },
];

export default function StatsPage() {
  const user = useAppStore((s) => s.user);
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    dismissError: dismissSummaryError,
  } = useAsyncData<StatsSummary>(() => Api.statsSummary(), []);

  const {
    data: grassData,
    loading: grassLoading,
    error: grassError,
    dismissError: dismissGrassError,
  } = useAsyncData<Record<string, number>>(() => Api.grass(365), []);

  const {
    data: series,
    loading: seriesLoading,
    error: seriesError,
    dismissError: dismissSeriesError,
  } = useAsyncData<SeriesPoint[]>(() => Api.series(period), [period]);

  const gIdx = summary ? gradeIndex(summary.rating_grade) : 0;
  const successPct = summary ? (summary.success_rate * 100).toFixed(1) : "0.0";

  const seriesMax = (series ?? []).reduce(
    (m, p) => Math.max(m, p.success, p.fail),
    0
  );
  const barWidth = (v: number) =>
    seriesMax > 0 ? `${Math.max((v / seriesMax) * 100, v > 0 ? 2 : 0)}%` : "0%";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold">통계 · 등급</h1>
        {user && (
          <span className="text-xs text-text-2 ml-auto">Lv. {user.level}</span>
        )}
      </div>

      {/* RATING GAUGE */}
      <div className="card space-y-3">
        {summaryError ? (
          <ErrorBanner message={summaryError} onDismiss={dismissSummaryError} />
        ) : summaryLoading ? (
          <Spinner block label="등급 불러오는 중..." />
        ) : summary ? (
          <>
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center">
                <span className="text-5xl font-bold text-accent leading-none">
                  {summary.rating_grade?.toUpperCase() || "D"}
                </span>
                <span className="text-[10px] text-text-2 mt-1">현재 등급</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-2">성공률</p>
                <p className="text-2xl font-semibold text-gold">{successPct}%</p>
                <p className="text-xs text-text-2 mt-1">
                  다음 등급까지 꾸준히 일정을 완료하세요.
                </p>
              </div>
            </div>
            {/* 5-segment bar */}
            <div className="flex gap-1.5">
              {GRADES.map((g, i) => (
                <div key={g} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`h-2 w-full rounded-full ${
                      i <= gIdx ? "bg-accent" : "bg-surface-2"
                    }`}
                  />
                  <span
                    className={`text-[10px] ${
                      i === gIdx ? "text-accent font-semibold" : "text-text-2"
                    }`}
                  >
                    {g}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* STREAK cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3">
          <Flame className="h-7 w-7 text-danger shrink-0" />
          <div>
            <p className="text-xs text-text-2">현재 스트릭</p>
            <p className="text-lg font-semibold text-text-1">
              {summary?.current_streak ?? 0}일
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Trophy className="h-7 w-7 text-gold shrink-0" />
          <div>
            <p className="text-xs text-text-2">최장 스트릭</p>
            <p className="text-lg font-semibold text-text-1">
              {summary?.longest_streak ?? 0}일
            </p>
          </div>
        </div>
      </div>

      {/* TOTALS card */}
      <div className="card">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold text-success">
              {summary?.total_completed ?? 0}
            </p>
            <p className="text-xs text-text-2">완료</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-danger">
              {summary?.total_failed ?? 0}
            </p>
            <p className="text-xs text-text-2">미달</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gold">{successPct}%</p>
            <p className="text-xs text-text-2">성공률</p>
          </div>
        </div>
      </div>

      {/* GRASS card */}
      <div className="card space-y-3">
        <h2 className="font-semibold">활동 잔디</h2>
        {grassError ? (
          <ErrorBanner message={grassError} onDismiss={dismissGrassError} />
        ) : grassLoading ? (
          <Spinner block label="활동 기록 불러오는 중..." />
        ) : (
          <GrassGraph data={grassData ?? {}} days={365} />
        )}
      </div>

      {/* SERIES card */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold inline-flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-accent" />
            기간별 추이
          </h2>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`text-xs rounded-full px-3 py-1 transition-colors ${
                  p.key === period
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-text-2 hover:bg-border"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {seriesError ? (
          <ErrorBanner message={seriesError} onDismiss={dismissSeriesError} />
        ) : seriesLoading ? (
          <Spinner block label="추이 불러오는 중..." />
        ) : !series || series.length === 0 ? (
          <p className="text-center text-text-2 text-sm py-4">
            데이터가 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {series.map((p) => (
              <div key={p.date} className="flex items-center gap-2">
                <span className="text-[10px] text-text-2 w-12 shrink-0 tabular-nums">
                  {p.date.slice(5)}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: barWidth(p.success),
                        backgroundColor: "#06D6A0",
                      }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: barWidth(p.fail),
                        backgroundColor: "#FF6B6B",
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-text-2 w-12 shrink-0 text-right tabular-nums">
                  <span className="text-success">{p.success}</span>
                  {" / "}
                  <span className="text-danger">{p.fail}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
