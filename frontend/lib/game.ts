// Game helpers — mirrors the spec in docs/for_ai/spec/api_and_rules.md.
// Backend is the source of truth; these are purely for client-side UI math.

/**
 * Total EXP required to *reach* a given level.
 * Spec: level = 1 + floor(sqrt(total_exp / 100))
 * Inversely: minimum total_exp to be at L = (L - 1)^2 * 100
 */
export function expFloorForLevel(level: number): number {
  const l = Math.max(1, level);
  return (l - 1) * (l - 1) * 100;
}

/** Total EXP required to reach the next level after the given one. */
export function expCeilForLevel(level: number): number {
  return expFloorForLevel(level + 1);
}

export interface LevelBarInfo {
  pct: number; // 0-100
  intoLevel: number;
  spanForLevel: number;
}

export function levelBar(totalExp: number, level: number): LevelBarInfo {
  const floor = expFloorForLevel(level);
  const ceil = expCeilForLevel(level);
  const span = Math.max(1, ceil - floor);
  const into = Math.max(0, totalExp - floor);
  const pct = Math.min(100, Math.round((into / span) * 100));
  return { pct, intoLevel: into, spanForLevel: span };
}

export function dailyCapPct(earned: number, cap: number): number {
  return Math.min(100, Math.round((earned / Math.max(1, cap)) * 100));
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  LOW: "쉬움",
  MEDIUM: "보통",
  HIGH: "어려움"
};

export const CATEGORY_LABEL: Record<string, string> = {
  CUSTOMIZE: "커스터마이즈",
  DEFENSE: "방어",
  PERSONA: "페르소나"
};

export const QUEST_LABEL: Record<string, string> = {
  ADD_PLAN: "오늘 일정 2개 추가",
  COMPLETE_PLAN: "오늘 일정 1개 완료",
  VISIT_SHOWCASE: "쇼케이스 방문"
};

export const CHARACTER_LABEL: Record<string, string> = {
  default: "기본",
  tsundere: "츤데레",
  knight: "용감한 기사"
};

// ---------- 칭호/캐릭터 등급(Grade) 표시 — 와이어프레임 정합 (uxui_05·06·08·09) ----------
// 모든 화면이 동일한 등급 색을 쓰도록 단일 소스로 둔다. 디자인 토큰만 사용(하드코딩 금지).
//   COMMON → 회색(text-2) · RARE → 시안(success) · EPIC → 퍼플(accent) · LEGENDARY → 골드(gold)

export type GradeKey = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

/** 와이어프레임 배지 표기(LEGENDARY는 "LEGEND"로 노출). */
export const GRADE_LABEL: Record<GradeKey, string> = {
  COMMON: "COMMON",
  RARE: "RARE",
  EPIC: "EPIC",
  LEGENDARY: "LEGEND"
};

export const GRADE_TEXT: Record<GradeKey, string> = {
  COMMON: "text-text-2",
  RARE: "text-success",
  EPIC: "text-accent",
  LEGENDARY: "text-gold"
};

export const GRADE_BORDER: Record<GradeKey, string> = {
  COMMON: "border-border",
  RARE: "border-success",
  EPIC: "border-accent",
  LEGENDARY: "border-gold"
};

/** 등급 배지용 합성 클래스 (테두리+글자+살짝 배경틴트). */
export function gradeBadgeClass(grade: string): string {
  const g = (grade as GradeKey) in GRADE_TEXT ? (grade as GradeKey) : "COMMON";
  return `${GRADE_TEXT[g]} ${GRADE_BORDER[g]}`;
}

export function gradeLabel(grade: string): string {
  return GRADE_LABEL[(grade as GradeKey)] ?? grade;
}
