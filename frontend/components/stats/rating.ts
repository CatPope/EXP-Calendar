// 누적 등급(Rating) 산출 — 프론트 전용 파생 로직 (uxui_09·10).
// 백엔드 rating_grade 가 있으면 그것을 우선하지만, 통계 화면은
// 월간 성공률로부터 등급/진척도를 직접 계산해 보여준다.
//
// 매핑(월간 성공률 → 등급):
//   ≥90% → S · ≥75% → A · ≥60% → B · ≥40% → C · 그 외 → D
//
// 각 밴드의 [하한, 상한)을 정의해 "다음 등급까지 N%"와 게이지 채움 비율을
// 밴드 내 위치(0~1)로부터 파생한다. (랜덤 아님)

export type RatingLetter = "D" | "C" | "B" | "A" | "S";

export const RATING_ORDER: RatingLetter[] = ["D", "C", "B", "A", "S"];

interface Band {
  letter: RatingLetter;
  /** 이 등급으로 인정되는 월간 성공률 하한(%). */
  min: number;
  /** 다음 등급 하한(%) = 이 등급의 상한. S는 100. */
  max: number;
}

// 위 매핑과 동일한 경계.
const BANDS: Band[] = [
  { letter: "D", min: 0, max: 40 },
  { letter: "C", min: 40, max: 60 },
  { letter: "B", min: 60, max: 75 },
  { letter: "A", min: 75, max: 90 },
  { letter: "S", min: 90, max: 100 }
];

export interface RatingInfo {
  letter: RatingLetter;
  /** 입력 월간 성공률(%) 0~100. */
  rate: number;
  /** 현재 밴드 내 진척(0~1). S는 90~100 구간 기준. */
  progress: number;
  /** 다음 등급 letter (S면 null). */
  next: RatingLetter | null;
  /** 다음 등급까지 남은 성공률 포인트(%). S면 0. */
  remainingPct: number;
  /** "상위 N%" 표기용 파생 백분위(낮을수록 상위). */
  topPercent: number;
}

/** 월간 성공률(0~100)로부터 등급/진척/표기 텍스트용 수치를 산출한다. */
export function ratingFromMonthlyRate(rateRaw: number): RatingInfo {
  const rate = Math.max(0, Math.min(100, rateRaw));
  const band = BANDS.find((b) => rate >= b.min && rate < b.max) ?? BANDS[BANDS.length - 1];
  const span = Math.max(1, band.max - band.min);
  const progress = Math.max(0, Math.min(1, (rate - band.min) / span));
  const idx = RATING_ORDER.indexOf(band.letter);
  const next = idx < RATING_ORDER.length - 1 ? RATING_ORDER[idx + 1] : null;
  const remainingPct = next ? Math.max(0, Math.round(band.max - rate)) : 0;
  // "상위 N%": 성공률이 높을수록 상위. 100% → 상위 1%, 0% → 상위 100%.
  const topPercent = Math.max(1, Math.round(100 - rate * 0.99));
  return { letter: band.letter, rate, progress, next, remainingPct, topPercent };
}
