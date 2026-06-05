// 추이 차트(주/월/연)의 라벨 포맷 헬퍼.
// 백엔드가 이미 period 단위(day/month/year)로 집계해 보내므로 클라이언트는
// 라벨 포맷팅만 담당한다. 응답의 date 필드는 항상 YYYY-MM-DD 형식이고
// 버킷 시작 날짜이다 (예: month → "YYYY-MM-01", year → "YYYY-01-01").

import type { SeriesPoint } from "@/lib/types";
import type { TrendPoint } from "@/components/insights/TrendLineChart";
import type { TFunction } from "@/lib/i18n";

type Period = "week" | "month" | "year";

export function buildDisplaySeries(
  series: SeriesPoint[] | null | undefined,
  period: Period,
  t: TFunction
): TrendPoint[] {
  if (!series || series.length === 0) return [];
  return series.map((p) => {
    let label = "";
    if (period === "week") {
      const day = parseInt(p.date.slice(8, 10), 10);
      label = t("insights.dayLabel", { n: day });
    } else if (period === "month") {
      const m = parseInt(p.date.slice(5, 7), 10);
      label = t(`insights.month${m}`);
    } else {
      const y = parseInt(p.date.slice(0, 4), 10);
      label = t("insights.yearLabel", { n: y });
    }
    return {
      key: p.date,
      label,
      success: p.success,
      fail: p.fail,
    };
  });
}
