"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Crown,
  AlertTriangle,
  Wand2,
  Send,
  Palette,
  Flame,
  Trophy,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import CosmeticAvatar from "@/components/CosmeticAvatar";
import TitleBadge from "@/components/TitleBadge";
import GrassGraph from "@/components/GrassGraph";
import TrendLineChart, { type TrendPoint } from "@/components/insights/TrendLineChart";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { UserTitle, StatsSummary, SeriesPoint } from "@/lib/types";
import { skinById } from "@/lib/character";
import type { SkinId } from "@/lib/character";

type DisplayPoint = TrendPoint;

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

export default function IdentityPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const pushToast = useAppStore((s) => s.pushToast);

  // 통계 추이 기간 토글
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");

  // 쇼케이스 통계 공유 토글
  const [statsPublicBusy, setStatsPublicBusy] = useState(false);
  async function toggleStatsPublic() {
    if (statsPublicBusy || !user) return;
    setStatsPublicBusy(true);
    const next = !user.stats_public;
    try {
      const updated = await Api.setStatsPublic(next);
      useAppStore.getState().setUser(updated);
      pushToast(
        "success",
        next ? t("identity.statsShareOnDone") : t("identity.statsShareOffDone")
      );
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setStatsPublicBusy(false);
    }
  }

  // AI 페르소나 한마디 (변환 → 쇼케이스 게시)
  // 게시는 항상 "직전 변환 결과"를 그대로 올린다. 변환을 한 적이 없거나,
  // 변환 이후 입력 텍스트가 바뀐 경우엔 경고만 띄우고 중단한다.
  const [voice, setVoice] = useState("");
  const [genResult, setGenResult] = useState<string | null>(null);
  const [convertedFor, setConvertedFor] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);

  async function doGenerate() {
    const text = voice.trim();
    if (!text) return;
    setGenerating(true);
    try {
      const r = await Api.generatePersona(text);
      setGenResult(r.llm_output);
      setConvertedFor(text);
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setGenerating(false);
    }
  }

  async function doPost() {
    const text = voice.trim();
    if (!text) return;
    // 변환 결과가 없거나, 변환 이후 입력이 바뀌었으면 게시하지 않고 안내.
    if (!genResult || convertedFor !== text) {
      pushToast("error", t("identity.aiNeedConvert"));
      return;
    }
    setPosting(true);
    try {
      const r = await Api.postShowcase(text, genResult);
      setGenResult(r.llm_output);
      pushToast("success", t("identity.aiPostSuccess"));
      // 게시 시 백엔드가 status_message("나의 한마디")도 같이 갱신하므로
      // 프로필 레일/통계 화면이 즉시 반영되도록 /me 를 다시 받아 store 갱신.
      try {
        const me = await Api.me();
        useAppStore.getState().setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setPosting(false);
    }
  }

  const {
    data: titles,
    loading: titlesLoading,
    error: titlesError,
    dismissError: dismissTitlesError,
  } = useAsyncData<UserTitle[]>(() => Api.myTitles(), []);

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

  const activeTitles = (titles ?? []).filter(
    (ut) => ut.is_equipped || ut.is_displayed
  );

  // Find any active title with a penalty
  const penaltyTitle = activeTitles.find(
    (ut) => ut.negative_modifier && ut.negative_modifier.trim().length > 0
  );

  const skinId = (user?.character_skin as SkinId) || undefined;
  const skinDef = skinById(skinId);
  const level = user?.level ?? 1;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            {t("identity.title")}
          </h1>
          <p className="text-sm text-text-2">{t("identity.subtitle")}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            href="/identity/settings"
            className="btn-ghost text-sm inline-flex items-center gap-1"
          >
            ✎ {t("identity.edit")}
          </Link>
          {!titlesLoading && titles && (
            <span className="text-xs text-text-2">
              {t("identity.titlesCount", { n: titles.length })}
            </span>
          )}
        </div>
      </div>

      {/* Penalty Banner */}
      {penaltyTitle && (
        <div className="rounded-md border border-danger/50 bg-danger/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span className="text-danger font-medium">
              ⚠ {t("identity.penaltyBanner", { name: penaltyTitle.title.name })}
            </span>
          </div>
          <Link
            href="/identity/settings"
            className="text-xs text-danger underline shrink-0"
          >
            {t("identity.recoverInSettings")} →
          </Link>
        </div>
      )}

      {summaryError && (
        <ErrorBanner message={summaryError} onDismiss={dismissSummaryError} />
      )}

      {/* MY IDENTITY card */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-text-2">{t("identity.myIdentity")}</h2>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar — 캐릭터 박스/버튼 모두 /character (스킨 변경) 진입점 */}
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/character"
              className="block group"
              aria-label={t("identity.changeSkin")}
            >
              <div className="transition-transform group-hover:scale-[1.02]">
                <CosmeticAvatar
                  level={level}
                  skin={skinId}
                  size={120}
                  withFrame
                  cosmetic={user?.active_cosmetic}
                />
              </div>
            </Link>
            <p className="text-xs text-text-2">
              {t("identity.skinLabel")}: {skinDef.label}
            </p>
            <Link
              href="/character"
              className="inline-flex items-center gap-1 text-xs btn-ghost"
            >
              <Palette className="h-3.5 w-3.5" /> {t("identity.changeSkin")}
            </Link>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-text-1">
                {user?.persona_name || user?.display_name || "—"}
              </span>
              <span className="text-sm font-semibold text-accent">
                Lv.{level}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {summaryLoading ? (
                <span className="text-xs text-text-2">{t("identity.loading")}</span>
              ) : summary ? (
                <span className="text-sm font-semibold">
                  {t("identity.ratingLabel")}{" "}
                  <span className="text-accent">
                    {summary.rating_grade?.toUpperCase() || "D"}
                  </span>
                </span>
              ) : null}
              {user?.equipped_title && (
                <TitleBadge title={user.equipped_title} />
              )}
            </div>

            {user?.persona_tone && (
              <div className="rounded bg-surface-2 border border-border px-3 py-2">
                <p className="text-[10px] text-text-2 mb-1">
                  {t("identity.toneLabel")}
                </p>
                <p className="text-sm text-text-1">{user.persona_tone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === 통계 흡수 섹션 ============================================== */}

      {/* RATING GAUGE */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {t("insights.statsTitle")}
          </h2>
          <button
            type="button"
            onClick={toggleStatsPublic}
            disabled={statsPublicBusy}
            className={`text-[11px] rounded-full px-3 py-1 inline-flex items-center gap-1 transition-colors disabled:opacity-50 ${
              user?.stats_public
                ? "bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25"
                : "bg-surface-2 text-text-2 border border-border hover:border-accent/40"
            }`}
            title={t("identity.statsShareDesc")}
          >
            {user?.stats_public ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            {user?.stats_public
              ? t("identity.statsShareOn")
              : t("identity.statsShareOff")}
          </button>
        </div>
        {summaryLoading ? (
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
          </>
        ) : null}
      </div>

      {/* STREAK */}
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

      {/* TOTALS */}
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

      {/* GRASS */}
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
          <ErrorBanner message={seriesError} onDismiss={dismissSeriesError} />
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

      {/* === /통계 흡수 ================================================ */}

      {/* Active Titles */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Crown className="h-4 w-4 text-gold" />
            {t("identity.activeTitlesSection")}
          </h2>
          <Link
            href="/identity/settings"
            className="text-xs text-accent hover:underline"
          >
            ♛ {t("identity.manageTitles")} →
          </Link>
        </div>

        {titlesError && (
          <ErrorBanner message={titlesError} onDismiss={dismissTitlesError} />
        )}

        {titlesLoading ? (
          <Spinner block label={t("identity.loading")} />
        ) : activeTitles.length === 0 ? (
          <p className="text-sm text-text-2 text-center py-2">
            {t("identity.noActiveTitles")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeTitles.map((ut) => (
              <div
                key={ut.id}
                className={`rounded-md border px-3 py-2 space-y-1 ${
                  ut.is_equipped
                    ? "border-accent/50 bg-accent/5"
                    : "border-border bg-surface-2"
                }`}
              >
                <TitleBadge title={ut.title} modifier={ut.negative_modifier} />
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {ut.is_equipped && (
                    <span className="text-[10px] text-accent border border-accent/40 rounded px-1.5 py-0.5">
                      ⚔ {t("identity.equipped")}
                    </span>
                  )}
                  {ut.is_displayed && (
                    <span className="text-[10px] text-gold border border-gold/40 rounded px-1.5 py-0.5">
                      ★ {t("identity.displayed")}
                    </span>
                  )}
                  {ut.negative_modifier && (
                    <span className="text-[10px] text-danger border border-danger/40 rounded px-1.5 py-0.5">
                      ⚠ {t("identity.penalty")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History & Thoughts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-text-2">
            {t("identity.history")}
          </h2>
          {user?.persona_history ? (
            <p className="text-sm text-text-1 whitespace-pre-wrap">
              {user.persona_history}
            </p>
          ) : (
            <p className="text-sm text-text-2 italic">{t("identity.noHistory")}</p>
          )}
        </div>
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-text-2">
            {t("identity.thoughts")}
          </h2>
          {user?.persona_thoughts ? (
            <p className="text-sm text-text-1 whitespace-pre-wrap">
              {user.persona_thoughts}
            </p>
          ) : (
            <p className="text-sm text-text-2 italic">{t("identity.noThoughts")}</p>
          )}
        </div>
      </div>

      {/* AI 페르소나 한마디 — 입력 텍스트를 캐릭터 말투로 변환해 쇼케이스에 게시 */}
      <div className="card space-y-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" /> {t("identity.aiTitle")}
          </h2>
          <p className="text-xs text-text-2">{t("identity.aiDesc")}</p>
        </div>
        <textarea
          value={voice}
          onChange={(e) => setVoice(e.target.value.slice(0, 300))}
          placeholder={t("identity.aiPlaceholder")}
          rows={3}
          className="w-full rounded-md bg-surface-2 border border-border px-3 py-2 text-sm text-text-1 resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-text-2">
            {t("identity.aiCounter", { n: voice.length })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doGenerate}
              disabled={generating || !voice.trim()}
              className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:border-accent/50 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {generating ? t("identity.converting") : t("identity.convert")}
            </button>
            <button
              type="button"
              onClick={doPost}
              disabled={posting || !voice.trim()}
              className="text-xs rounded-md px-3 py-1.5 bg-accent text-white hover:bg-accent/80 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {posting ? t("identity.posting") : t("identity.postShowcase")}
            </button>
          </div>
        </div>
        {genResult && (
          <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
            <div className="text-[10px] text-text-2 mb-1">
              {t("identity.resultTitle")}
            </div>
            <p className="text-sm text-text-1 whitespace-pre-wrap">{genResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
