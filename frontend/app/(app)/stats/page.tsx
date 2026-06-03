"use client";

import { useState, useMemo } from "react";
import { BarChart3, Flame, Trophy, TrendingUp, Pencil } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import GrassGraph from "@/components/GrassGraph";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { StatsSummary, SeriesPoint } from "@/lib/types";

interface DisplayPoint {
  key: string;
  label: string;
  success: number;
  fail: number;
}

const GRADES = ["D", "C", "B", "A", "S"] as const;

function gradeIndex(grade: string): number {
  const i = GRADES.indexOf(grade?.toUpperCase() as (typeof GRADES)[number]);
  return i < 0 ? 0 : i;
}

const PERIODS: { key: "week" | "month" | "year"; labelKey: string }[] = [
  { key: "week", labelKey: "insights.periodWeek" },
  { key: "month", labelKey: "insights.periodMonth" },
  { key: "year", labelKey: "insights.periodYear" },
];

export default function StatsPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const pushToast = useAppStore((s) => s.pushToast);
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");

  // Status message editor state
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  function openStatusEditor() {
    setStatusDraft(user?.status_message ?? "");
    setEditingStatus(true);
  }

  function cancelStatusEdit() {
    setEditingStatus(false);
    setStatusDraft("");
  }

  async function saveStatus() {
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      const updated = await Api.setStatusMessage(statusDraft.trim());
      setUser(updated);
      pushToast("success", t("insights.statusSaveSuccess"));
      setEditingStatus(false);
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setStatusBusy(false);
    }
  }

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

  // Build display-ready points: aggregate year → 12 monthly buckets; format labels per period.
  const displaySeries = useMemo<DisplayPoint[]>(() => {
    if (!series || series.length === 0) return [];

    if (period === "year") {
      // Aggregate daily rows into 12 monthly buckets keyed by "YYYY-MM".
      const buckets = new Map<string, { success: number; fail: number }>();
      for (const p of series) {
        const monthKey = p.date.slice(0, 7); // "YYYY-MM"
        const b = buckets.get(monthKey) ?? { success: 0, fail: 0 };
        b.success += p.success;
        b.fail += p.fail;
        buckets.set(monthKey, b);
      }
      // Sort by month key ascending, take up to 12.
      const sorted = Array.from(buckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12);
      return sorted.map(([monthKey, val]) => {
        const m = parseInt(monthKey.slice(5), 10); // 1..12
        return {
          key: monthKey,
          label: t(`insights.month${m}`),
          success: val.success,
          fail: val.fail,
        };
      });
    }

    if (period === "week") {
      // Use the raw 7 rows; label as weekday short name + M/D.
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return series.map((p) => {
        const d = new Date(p.date + "T00:00:00");
        const dayAbbr = dayNames[d.getDay()];
        const md = p.date.slice(5).replace("-", "/"); // "MM/DD"
        return {
          key: p.date,
          label: `${dayAbbr} ${md}`,
          success: p.success,
          fail: p.fail,
        };
      });
    }

    // month: daily bars (~30), label as day number.
    return series.map((p) => ({
      key: p.date,
      label: String(parseInt(p.date.slice(8), 10)), // day of month, no leading zero
      success: p.success,
      fail: p.fail,
    }));
  }, [series, period, t]);

  const seriesMax = displaySeries.reduce(
    (m, p) => Math.max(m, p.success, p.fail),
    0
  );
  const barWidth = (v: number) =>
    seriesMax > 0 ? `${Math.max((v / seriesMax) * 100, v > 0 ? 2 : 0)}%` : "0%";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold">{t("insights.statsTitle")}</h1>
        {user && (
          <span className="text-xs text-text-2 ml-auto">Lv. {user.level}</span>
        )}
      </div>

      {/* STATUS MESSAGE EDITOR */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-2">
            {t("insights.statusMessageLabel")}
          </span>
          {!editingStatus && (
            <button
              onClick={openStatusEditor}
              className="inline-flex items-center gap-1 text-xs text-accent hover:opacity-80"
            >
              <Pencil className="h-3 w-3" />
              {t("insights.editStatus")}
            </button>
          )}
        </div>

        {editingStatus ? (
          <div className="space-y-2">
            <textarea
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value.slice(0, 200))}
              placeholder={t("insights.statusPlaceholder")}
              rows={3}
              className="w-full rounded-md bg-surface-2 border border-border px-3 py-2 text-sm text-text-1 placeholder:text-text-2 resize-none focus:outline-none focus:border-accent"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-2">
                {t("insights.statusCounter", { n: statusDraft.length })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={cancelStatusEdit}
                  disabled={statusBusy}
                  className="text-xs rounded-md px-3 py-1 bg-surface-2 text-text-2 hover:bg-border disabled:opacity-50"
                >
                  {t("insights.cancel")}
                </button>
                <button
                  onClick={saveStatus}
                  disabled={statusBusy}
                  className="text-xs rounded-md px-3 py-1 bg-accent text-white hover:opacity-90 disabled:opacity-50"
                >
                  {statusBusy ? t("insights.saving") : t("insights.save")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-1 min-h-[1.5rem]">
            {user?.status_message || (
              <span className="text-text-2 italic">{t("insights.statusPlaceholder")}</span>
            )}
          </p>
        )}
      </div>

      {/* RATING GAUGE */}
      <div className="card space-y-3">
        {summaryError ? (
          <ErrorBanner message={summaryError} onDismiss={dismissSummaryError} />
        ) : summaryLoading ? (
          <Spinner block label={t("insights.loadingGrade")} />
        ) : summary ? (
          <>
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center">
                <span className="text-5xl font-bold text-accent leading-none">
                  {summary.rating_grade?.toUpperCase() || "D"}
                </span>
                <span className="text-[10px] text-text-2 mt-1">{t("insights.currentGrade")}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-2">{t("insights.successRate")}</p>
                <p className="text-2xl font-semibold text-gold">{successPct}%</p>
                {typeof summary.percentile === "number" && (
                  <p className="text-xs text-accent font-semibold mt-0.5">
                    {t("insights.topPercentile", { n: summary.percentile })}
                  </p>
                )}
              </div>
            </div>
            {/* 5-segment grade bar */}
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
            {/* Next grade progress */}
            {summary.next_grade ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-text-2">
                  <span>
                    {t("insights.toNextGrade", {
                      grade: summary.next_grade,
                      n: Math.max(0, 100 - summary.next_grade_pct),
                    })}
                  </span>
                  <span className="text-accent font-semibold">
                    {summary.next_grade_pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${Math.min(100, summary.next_grade_pct)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-gold font-semibold">
                {t("insights.maxGrade")}
              </p>
            )}
          </>
        ) : null}
      </div>

      {/* STREAK cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3">
          <Flame className="h-7 w-7 text-danger shrink-0" />
          <div>
            <p className="text-xs text-text-2">{t("insights.currentStreak")}</p>
            <p className="text-lg font-semibold text-text-1">
              {t("insights.streakDays", { n: summary?.current_streak ?? 0 })}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Trophy className="h-7 w-7 text-gold shrink-0" />
          <div>
            <p className="text-xs text-text-2">{t("insights.longestStreak")}</p>
            <p className="text-lg font-semibold text-text-1">
              {t("insights.streakDays", { n: summary?.longest_streak ?? 0 })}
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
            <p className="text-xs text-text-2">{t("insights.completed")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-danger">
              {summary?.total_failed ?? 0}
            </p>
            <p className="text-xs text-text-2">{t("insights.failed")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gold">{successPct}%</p>
            <p className="text-xs text-text-2">{t("insights.successRate")}</p>
          </div>
        </div>
      </div>

      {/* GRASS card */}
      <div className="card space-y-3">
        <h2 className="font-semibold">{t("insights.activityGrass")}</h2>
        {grassError ? (
          <ErrorBanner message={grassError} onDismiss={dismissGrassError} />
        ) : grassLoading ? (
          <Spinner block label={t("insights.loadingActivity")} />
        ) : (
          <GrassGraph data={grassData ?? {}} days={365} />
        )}
      </div>

      {/* SERIES card */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold inline-flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-accent" />
            {t("insights.periodTrend")}
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
                {t(p.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {seriesError ? (
          <ErrorBanner message={seriesError} onDismiss={dismissSeriesError} />
        ) : seriesLoading ? (
          <Spinner block label={t("insights.loadingTrend")} />
        ) : displaySeries.length === 0 ? (
          <p className="text-center text-text-2 text-sm py-4">
            {t("insights.noData")}
          </p>
        ) : (
          <div className="space-y-1.5">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-text-2 mb-1">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success" />
                {t("insights.trendSuccess")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-danger" />
                {t("insights.trendFail")}
              </span>
            </div>
            {displaySeries.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <span
                  className="text-[10px] text-text-2 shrink-0 tabular-nums text-right"
                  style={{ width: period === "week" ? "4.5rem" : "1.75rem" }}
                >
                  {p.label}
                </span>
                <div className="flex-1 space-y-0.5">
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: barWidth(p.success),
                        backgroundColor: "#06D6A0",
                      }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: barWidth(p.fail),
                        backgroundColor: "#FF6B6B",
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-text-2 w-10 shrink-0 text-right tabular-nums">
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
