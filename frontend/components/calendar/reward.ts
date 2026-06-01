// Calendar-local display helpers — difficulty color bars + reward EXP preview.
// Mirrors the SSoT EXP table (docs/for_ai/spec/api_and_rules.md). Backend is the
// authority for the actual award; this is purely for the day-view "보상 EXP NN ×mult"
// label and the left color bars seen in uxui_01/02/03. Tokens only, no hex.

import type { Difficulty, User } from "@/lib/types";

/** base EXP per difficulty (SSoT 게임 규칙 표). */
const BASE_EXP: Record<Difficulty, number> = {
  LOW: 10,
  MEDIUM: 25,
  HIGH: 50
};

/** tendency multiplier (온보딩 가중치): EASY 1.2 / NORMAL 1.0 / HARD 0.8. */
function tendencyMult(user: User | null): number {
  switch (user?.tendency) {
    case "EASY":
      return 1.2;
    case "HARD":
      return 0.8;
    default:
      return 1.0;
  }
}

export interface RewardPreview {
  /** 표시용 최종 EXP(저레벨 가중치 + tendency 반영, round). */
  exp: number;
  /** 와이어프레임의 "×mult" — tendency 배율. */
  mult: number;
}

/** uxui_03의 "보상 EXP NN ×mult" 미리보기 값을 계산한다. */
export function rewardPreview(difficulty: Difficulty, user: User | null): RewardPreview {
  const base = BASE_EXP[difficulty] ?? 0;
  const levelBonus = (user?.level ?? 1) < 10 ? 1.5 : 1.0;
  const mult = tendencyMult(user);
  return { exp: Math.round(base * levelBonus * mult), mult };
}

/** 좌측 색 바 — 난이도별. LOW=시안(success) MEDIUM=퍼플(accent) HIGH=레드(danger). */
export const DIFFICULTY_BAR: Record<Difficulty, string> = {
  LOW: "bg-success",
  MEDIUM: "bg-accent",
  HIGH: "bg-danger"
};
