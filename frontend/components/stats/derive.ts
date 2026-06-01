// 통계 화면 파생 계산 — 잔디/시계열 데이터로부터 성공률·스트릭을 도출 (uxui_09·10).

import { addDays, fromYMD, toYMD } from "@/lib/date";
import type { StatsSeriesPoint } from "@/lib/types";

/** 시계열 합으로 성공률(%) 계산. 분모 0이면 null(=표시 "—"). */
export function successRate(points: StatsSeriesPoint[] | null | undefined): number | null {
  if (!points || points.length === 0) return null;
  let s = 0;
  let f = 0;
  for (const p of points) {
    s += p.success || 0;
    f += p.fail || 0;
  }
  const total = s + f;
  if (total <= 0) return null;
  return Math.round((s / total) * 100);
}

/**
 * 잔디(일별 성공 건수)에서 success>0 인 연속 달력일의 최장 길이를 구한다.
 * data 가 빈 객체면 0.
 */
export function longestStreak(grass: Record<string, number> | null | undefined): number {
  if (!grass) return 0;
  const days = Object.keys(grass)
    .filter((ymd) => (grass[ymd] || 0) > 0)
    .sort();
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const cur = days[i];
    // prev + 1일 == cur 인지 달력 기준으로 검사.
    const expected = toYMD(addDays(fromYMD(prev), 1));
    if (expected === cur) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
