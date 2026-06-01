"use client";

// 통계 · 등급 (Stats) — uxui_09 / uxui_10.
// 내 캐릭터 카드 + 4종 지표 + 잔디 그래프 + 성공/실패 시계열 + 누적 등급(Rating).

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { StatsSeriesPoint, Title, User, UserTitle } from "@/lib/types";
import GrassGraph from "@/components/GrassGraph";
import ErrorBanner from "@/components/ErrorBanner";
import Spinner from "@/components/common/Spinner";
import CharacterCard from "@/components/stats/CharacterCard";
import StatCard from "@/components/stats/StatCard";
import SuccessSeriesChart from "@/components/stats/SuccessSeriesChart";
import RatingGauge from "@/components/stats/RatingGauge";
import { successRate, longestStreak } from "@/components/stats/derive";
import { ratingFromMonthlyRate } from "@/components/stats/rating";

interface StatsData {
  user: User;
  grass: Record<string, number>;
  weekSeries: StatsSeriesPoint[];
  monthSeries: StatsSeriesPoint[];
  displayedTitles: Title[];
}

export default function StatsPage() {
  const storedUser = useAppStore((s) => s.user);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // user: 스토어에 있으면 재사용, 없으면 /me.
        const userP: Promise<User> = storedUser
          ? Promise.resolve(storedUser)
          : Api.me();
        const [user, grass, weekSeries, monthSeries, titles] = await Promise.all([
          userP,
          Api.grass(365),
          Api.statsSeries("week"),
          Api.statsSeries("month"),
          Api.myTitles().catch(() => [] as UserTitle[])
        ]);
        if (cancelled) return;
        const displayedTitles = titles
          .filter((t) => t.is_displayed)
          .map((t) => t.title);
        setData({ user, grass, weekSeries, monthSeries, displayedTitles });
      } catch (e) {
        if (!cancelled) setError(humanizeError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // storedUser 는 첫 로드 기준만 사용 — 의존성에서 제외해 토스트/리워드 변경 시 재호출 방지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="h-5 w-5 text-accent" /> 내 캐릭터 · 통계
        </h1>
        <p className="text-xs text-text-2">
          캐릭터 프로필 · 잔디 그래프 · 성공률 시계열 · 누적 등급(Rating)
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <Spinner block label="통계 불러오는 중..." />
      ) : !data ? (
        <div className="card text-center text-sm text-text-2">
          통계를 표시할 수 없습니다.
        </div>
      ) : (
        <StatsContent data={data} />
      )}
    </div>
  );
}

function StatsContent({ data }: { data: StatsData }) {
  const { user, grass, weekSeries, monthSeries, displayedTitles } = data;

  const weekly = successRate(weekSeries);
  const monthly = successRate(monthSeries);
  const streak = longestStreak(grass);
  // 등급은 월간 성공률 기준(분모 0이면 0%로 간주 → D).
  const rating = ratingFromMonthlyRate(monthly ?? 0);

  const fmtPct = (v: number | null) => (v == null ? "—" : `${v}%`);

  return (
    <>
      {/* MY CHARACTER */}
      <CharacterCard
        user={user}
        rating={rating.letter}
        displayedTitles={displayedTitles}
      />

      {/* 4종 지표 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="주간 성공률" value={fmtPct(weekly)} valueClass="text-success" />
        <StatCard label="월간 성공률" value={fmtPct(monthly)} valueClass="text-accent" />
        <StatCard label="최장 스트릭" value={`${streak}일`} valueClass="text-text-1" />
        <StatCard label="등급" value={rating.letter} valueClass="text-gold font-mono" />
      </div>

      {/* 잔디 그래프 */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-2">▦ 잔디 그래프 · 일일 성공 기록</h2>
          <span className="text-xs text-text-2">최근 1년</span>
        </div>
        <GrassGraph data={grass} days={365} />
      </div>

      {/* 성공/실패 시계열 + 등급 산출 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-text-2">■ 성공/실패 시계열</h2>
          <SuccessSeriesChart points={weekSeries} limit={12} />
          <div className="flex items-center justify-between text-xs text-text-2">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 bg-success" /> 성공 일수
            </span>
            <span>최근 12주 추세</span>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-text-2">♛ 등급 산출</h2>
          <RatingGauge info={rating} />
        </div>
      </div>
    </>
  );
}
