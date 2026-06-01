// 소환 / 가챠 (uxui_06–07) — 프론트 전용 mock.
// 가챠 백엔드 엔드포인트가 없으므로 카탈로그/확률/뽑기 로직을 여기에서 자급한다.
// 확률은 SSoT 문서에 명세가 없어 와이어프레임(uxui_06) 수치를 사용한다.

import type { GachaRate, Grade, SummonCharacter, SummonOutcome } from "./types";

// ---------- 확률 (uxui_06 확률 정보 패널) ----------
// LEGENDARY 3% · EPIC 9% · RARE 28% · COMMON 60% (합계 100)
export const RATES: GachaRate[] = [
  { grade: "LEGENDARY", percent: 3 },
  { grade: "EPIC", percent: 9 },
  { grade: "RARE", percent: 28 },
  { grade: "COMMON", percent: 60 },
];

/** 천장: 90회 연속 LEGENDARY 미획득 시 다음 소환에서 LEGENDARY 확정. */
export const PITY = 90;

/** 픽업 대상 — 이 LEGENDARY가 LEGENDARY 풀 내에서 2배 가중치를 가진다. */
export const PICKUP_ID = "rainbow_dragon";

/** 비용 (포인트). */
export const COST_SINGLE = 100;
export const COST_TEN = 900;

// ---------- 도감 카탈로그 (uxui_07 — 11종, 4/11 보유) ----------
// appearance = 등급별 픽셀 타일 색 키(아래 GRADE_TILE 와 연결). 깨진 이미지 의존을 피한다.
export const CATALOG: SummonCharacter[] = [
  // --- 보유 4종 (1행) ---
  {
    id: "pixel_slime",
    name: "픽셀 슬라임",
    grade: "COMMON",
    appearance: "common",
    description: "어디서나 볼 수 있는 친근한 동반자.",
    owned: true,
    equipped: true, // 장착중
  },
  {
    id: "sprout_slime",
    name: "새싹 슬라임",
    grade: "COMMON",
    appearance: "common",
    description: "갓 깨어난 풋풋한 슬라임.",
    owned: true,
    equipped: false,
  },
  {
    id: "water_drop",
    name: "물방울",
    grade: "COMMON",
    appearance: "common",
    description: "투명하게 반짝이는 물의 정령.",
    owned: true,
    equipped: false,
  },
  {
    id: "pink_jelly",
    name: "분홍 젤리",
    grade: "RARE",
    appearance: "rare",
    description: "말랑한 분홍빛 희귀 젤리.",
    owned: true,
    equipped: false,
  },
  // --- 미획득 (2행: RARE×2, EPIC×2) ---
  {
    id: "amber_slime",
    name: "호박 슬라임",
    grade: "RARE",
    appearance: "rare",
    description: "따뜻한 호박색의 단단한 슬라임.",
    owned: false,
    equipped: false,
  },
  {
    id: "shadow_slime",
    name: "그림자 슬라임",
    grade: "RARE",
    appearance: "rare",
    description: "어둠 속에 숨어 사는 희귀종.",
    owned: false,
    equipped: false,
  },
  {
    id: "forest_spirit",
    name: "숲의 정령",
    grade: "EPIC",
    appearance: "epic",
    description: "깊은 숲의 기운을 머금은 영웅급 동반자.",
    owned: false,
    equipped: false,
  },
  {
    id: "void_slime",
    name: "공허 슬라임",
    grade: "EPIC",
    appearance: "epic",
    description: "별빛을 삼킨 보랏빛 영웅급 슬라임.",
    owned: false,
    equipped: false,
  },
  // --- 미획득 (3행: EPIC, LEGEND×2) ---
  {
    id: "ember_beast",
    name: "잿불 야수",
    grade: "EPIC",
    appearance: "epic",
    description: "타오르는 잿불을 두른 영웅급 야수.",
    owned: false,
    equipped: false,
  },
  {
    id: "golden_guardian",
    name: "황금 수호자",
    grade: "LEGENDARY",
    appearance: "legendary",
    description: "고대의 빛을 지키는 전설의 수호자.",
    owned: false,
    equipped: false,
  },
  {
    id: PICKUP_ID,
    name: "무지개 드래곤",
    grade: "LEGENDARY",
    appearance: "legendary",
    description: "전설의 소환수. 픽업 대상으로 확률이 2배.",
    owned: false,
    equipped: false,
  },
];

// ---------- 픽셀 타일 색 (등급 → 디자인 토큰 배경) ----------
// 하드코딩 hex 금지: tailwind 토큰만 사용.
export const GRADE_TILE: Record<Grade, string> = {
  COMMON: "bg-text-2/30",
  RARE: "bg-success/30",
  EPIC: "bg-accent/40",
  LEGENDARY: "bg-gold/40",
};

// ---------- 뽑기 로직 ----------

const GRADE_ORDER: Grade[] = ["LEGENDARY", "EPIC", "RARE", "COMMON"];

function gradeRank(g: Grade): number {
  return GRADE_ORDER.indexOf(g); // 0 = 최고
}

/** 확률 테이블에서 등급 1개를 뽑는다. */
function rollGrade(): Grade {
  const r = Math.random() * 100;
  let acc = 0;
  // 희귀 등급부터 누적해서 비교 (LEGENDARY → COMMON 순)
  for (const rate of RATES) {
    acc += rate.percent;
    if (r < acc) return rate.grade;
  }
  return "COMMON";
}

/** 해당 등급의 카탈로그 후보들. */
function poolForGrade(grade: Grade): SummonCharacter[] {
  return CATALOG.filter((c) => c.grade === grade);
}

/** 등급 내에서 1마리 선택. LEGENDARY는 픽업(무지개 드래곤) 가중치 2배. */
function pickFromGrade(grade: Grade): SummonCharacter {
  const pool = poolForGrade(grade);
  if (pool.length === 0) {
    // 안전 폴백 (정상적으로는 발생하지 않음)
    return CATALOG[0];
  }
  if (grade === "LEGENDARY") {
    // 픽업은 가중치 2, 그 외 1.
    const weighted: SummonCharacter[] = [];
    for (const c of pool) {
      weighted.push(c);
      if (c.id === PICKUP_ID) weighted.push(c); // 2배
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function toOutcome(c: SummonCharacter): SummonOutcome {
  return { character: c, isNew: !c.owned };
}

/** 단차 1회. */
export function roll(): SummonOutcome {
  const grade = rollGrade();
  return toOutcome(pickFromGrade(grade));
}

/**
 * 10연차. RARE 이상 1개 이상을 보장한다(uxui_06 "10연차 시 RARE 이상 1개 확정").
 * 10개를 뽑은 뒤 모두 COMMON이면 마지막 1개를 RARE 이상으로 교체한다.
 */
export function roll10(): SummonOutcome[] {
  const out: SummonOutcome[] = [];
  for (let i = 0; i < 10; i++) out.push(roll());

  const hasRarePlus = out.some((o) => gradeRank(o.character.grade) <= gradeRank("RARE"));
  if (!hasRarePlus) {
    // 마지막 슬롯을 RARE 이상으로 강제 (RARE/EPIC/LEGENDARY 비율 유지하여 재추첨)
    const upgraded = pickRarePlus();
    out[out.length - 1] = toOutcome(upgraded);
  }
  return out;
}

/** RARE 이상 보장 추첨 (10연차 확정 슬롯용). */
function pickRarePlus(): SummonCharacter {
  const sub = RATES.filter((r) => gradeRank(r.grade) <= gradeRank("RARE"));
  const total = sub.reduce((s, r) => s + r.percent, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const rate of sub) {
    acc += rate.percent;
    if (r < acc) return pickFromGrade(rate.grade);
  }
  return pickFromGrade("RARE");
}

/** 천장 확정: LEGENDARY 1마리 (픽업 가중치 적용). */
export function pickLegendary(): SummonOutcome {
  return toOutcome(pickFromGrade("LEGENDARY"));
}

// ---------- 보유 상태 영속화 (localStorage) ----------
const STORAGE_KEY = "exp-calendar.summon";

interface SummonState {
  owned: string[];
  equipped: string | null;
  pity: number;
}

export function loadSummonState(): SummonState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SummonState;
    if (!Array.isArray(parsed.owned)) return null;
    return {
      owned: parsed.owned,
      equipped: parsed.equipped ?? null,
      pity: typeof parsed.pity === "number" ? parsed.pity : 0,
    };
  } catch {
    return null;
  }
}

export function saveSummonState(state: SummonState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 저장 실패는 무시 (mock) */
  }
}

/** 카탈로그 기본값을 영속 상태로 머지한 초기 도감을 만든다. */
export function buildInitialDex(): SummonCharacter[] {
  const saved = loadSummonState();
  if (!saved) return CATALOG.map((c) => ({ ...c }));
  return CATALOG.map((c) => {
    const owned = c.owned || saved.owned.includes(c.id);
    return {
      ...c,
      owned,
      equipped: saved.equipped ? saved.equipped === c.id : c.equipped,
    };
  });
}
