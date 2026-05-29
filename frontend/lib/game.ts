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
