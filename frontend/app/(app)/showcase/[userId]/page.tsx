"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart3,
  Flame,
  Trophy,
  TrendingUp,
  EyeOff,
} from "lucide-react";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { ShowcaseDetail, SeriesPoint } from "@/lib/types";
import TitleBadge from "@/components/TitleBadge";
import GrassGraph from "@/components/GrassGraph";
import CosmeticAvatar from "@/components/CosmeticAvatar";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import Spinner from "@/components/common/Spinner";
import TrendLineChart, {
  type TrendPoint,
} from "@/components/insights/TrendLineChart";
import type { SkinId } from "@/lib/character";

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

export default function ShowcaseDetailPage() {
  const t = useT();
  const params = useParams<{ userId: string }>();
  const setUser = useAppStore((s) => s.setUser);
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");

  const {
    data: detail,
    loading,
    error,
    dismissError,
  } = useAsyncData<ShowcaseDetail>(
    () => Api.showcaseDetail(params.userId),
    [params.userId]
  );

  // 통계 공개 사용자에 대해서만 series 를 가져온다.
  const seriesEnabled = !!detail?.stats_public;
  const {
    data: series,
    loading: seriesLoading,
    error: seriesError,
    dismissError: dismissSeriesError,
  } = useAsyncData<SeriesPoint[]>(
    () =>
      seriesEnabled
        ? Api.showcaseSeries(params.userId, period)
        : Promise.resolve<SeriesPoint[]>([]),
    [params.userId, period, seriesEnabled]
  );

  // Fire-and-forget quest completion + /me refresh after a successful load.
  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    (async () => {
      try {
        await Api.completeQuest("VISIT_SHOWCASE");
      } catch {
        /* non-fatal */
      }
      try {
        const me = await Api.me();
        if (!cancelled) setUser(me);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, setUser]);

  const summary = detail?.summary;
  const gIdx = summary ? gradeIndex(summary.rating_grade) : 0;
  const successPct = summary ? (summary.success_rate * 100).toFixed(1) : "0.0";

  const displaySeries = useMemo<TrendPoint[]>(() => {
    if (!series || series.length === 0) return [];
    if (period === "year") {
      const buckets = new Map<string, { success: number; fail: number }>();
      for (const p of series) {
        const monthKey = p.date.slice(0, 7);
        const b = buckets.get(monthKey) ?? { success: 0, fail: 0 };
        b.success += p.success;
        b.fail += p.fail;
        buckets.set(monthKey, b);
      }
      const sorted = Array.from(buckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12);
      return sorted.map(([monthKey, val]) => {
        const m = parseInt(monthKey.slice(5), 10);
        return {
          key: monthKey,
          label: t(`insights.month${m}`),
          success: val.success,
          fail: val.fail,
        };
      });
    }
    if (period === "week") {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return series.map((p) => {
        const d = new Date(p.date + "T00:00:00");
        const dayAbbr = dayNames[d.getDay()];
        const md = p.date.slice(5).replace("-", "/");
        return {
          key: p.date,
          label: `${dayAbbr} ${md}`,
          success: p.success,
          fail: p.fail,
        };
      });
    }
    return series.map((p) => ({
      key: p.date,
      label: String(parseInt(p.date.slice(8), 10)),
      success: p.success,
      fail: p.fail,
    }));
  }, [series, period, t]);

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={dismissError} />}
      {loading ? (
        <Loading />
      ) : !detail ? (
        <div className="text-text-2">{t("insights.userNotFound")}</div>
      ) : (
        <>
          {/* 프로필 카드 */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-accent/20 border border-accent/50 flex items-center justify-center font-bold text-accent text-lg">
                  {detail.level}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{detail.display_name}</h1>
                  <div className="text-sm text-text-2">
                    Lv. {detail.level} · {t("insights.gradeLabel")} {detail.rating_grade}
                  </div>
                </div>
              </div>
              <TitleBadge title={detail.equipped_title} />
            </div>
            {detail.displayed_titles?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                {detail.displayed_titles.map((tt) => (
                  <TitleBadge key={tt.id} title={tt} />
                ))}
              </div>
            )}
          </div>

          {/* 캐릭터 */}
          <div className="card flex flex-col items-center gap-3 py-6">
            <CosmeticAvatar
              level={detail.level}
              skin={(detail.character_skin as SkinId) || undefined}
              size={320}
              cosmetic={
                (detail as unknown as { active_cosmetic?: string }).active_cosmetic
              }
            />
            {(detail.persona_name || detail.status_message) && (
              <div className="text-center space-y-1">
                {detail.persona_name && (
                  <div className="text-base font-bold text-text-1">
                    {detail.persona_name}
                  </div>
                )}
                {detail.status_message && (
                  <div className="text-sm text-text-2 italic max-w-xs">
                    &ldquo;{detail.status_message}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {detail.persona_showcase_text && (
            <div className="card space-y-2">
              <h2 className="text-sm font-semibold text-text-2">{t("insights.personaQuote")}</h2>
              <div className="text-text-1 whitespace-pre-wrap">{detail.persona_llm_output}</div>
              <div className="text-xs text-text-2 border-t border-border pt-2">
                {t("insights.originalText")}: {detail.persona_showcase_text}
              </div>
            </div>
          )}

          {/* 통계 섹션 — stats_public 일 때만 노출 */}
          {detail.stats_public && summary ? (
            <>
              {/* RATING GAUGE */}
              <div className="card space-y-3">
                <h2 className="text-sm font-semibold text-text-2 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-accent" />
                  {t("insights.statsTitle")}
                </h2>
                <div className="flex items-end gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-5xl font-bold text-accent leading-none">
                      {summary.rating_grade?.toUpperCase() || "D"}
                    </span>
                    <span className="text-[10px] text-text-2 mt-1">
                      {t("insights.currentGrade")}
                    </span>
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
              </div>

              {/* STREAK */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card flex items-center gap-3">
                  <Flame className="h-7 w-7 text-danger shrink-0" />
                  <div>
                    <p className="text-xs text-text-2">
                      {t("insights.currentStreak")}
                    </p>
                    <p className="text-lg font-semibold text-text-1">
                      {t("insights.streakDays", { n: summary.current_streak ?? 0 })}
                    </p>
                  </div>
                </div>
                <div className="card flex items-center gap-3">
                  <Trophy className="h-7 w-7 text-gold shrink-0" />
                  <div>
                    <p className="text-xs text-text-2">
                      {t("insights.longestStreak")}
                    </p>
                    <p className="text-lg font-semibold text-text-1">
                      {t("insights.streakDays", { n: summary.longest_streak ?? 0 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* TOTALS */}
              <div className="card">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-success">
                      {summary.total_completed ?? 0}
                    </p>
                    <p className="text-xs text-text-2">{t("insights.completed")}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-danger">
                      {summary.total_failed ?? 0}
                    </p>
                    <p className="text-xs text-text-2">{t("insights.failed")}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gold">{successPct}%</p>
                    <p className="text-xs text-text-2">{t("insights.successRate")}</p>
                  </div>
                </div>
              </div>

              {/* GRASS — 1년 활동 */}
              <div className="card space-y-3">
                <h2 className="font-semibold">{t("insights.activityGrass")}</h2>
                <GrassGraph data={detail.grass || {}} days={365} />
              </div>

              {/* SERIES */}
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
                  <ErrorBanner
                    message={seriesError}
                    onDismiss={dismissSeriesError}
                  />
                ) : seriesLoading ? (
                  <Spinner block label={t("insights.loadingTrend")} />
                ) : displaySeries.length === 0 ? (
                  <p className="text-center text-text-2 text-sm py-4">
                    {t("insights.noData")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
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
                    <TrendLineChart
                      points={displaySeries}
                      showAllLabels={period !== "month"}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card flex items-center gap-3 text-sm text-text-2">
              <EyeOff className="h-4 w-4 shrink-0" />
              <span>{t("insights.statsHidden")}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
