// Character skin catalog + 칭호 등급 기반 해금 로직.
// 스킨은 public/characters/Skins/*.png (3D 모델 텍스처)에 대응한다.

export type SkinId = "skaterMaleA" | "skaterFemaleA" | "criminalMaleA" | "cyborgFemaleA";

export type Grade = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface SkinDef {
  id: SkinId;
  label: string;
  url: string;
  rim: string | null;
  /** 이 등급 이상의 칭호를 보유하면 해금. null이면 기본(항상 사용 가능). */
  unlockGrade: Grade | null;
}

export const SKINS: SkinDef[] = [
  { id: "skaterMaleA", label: "스케이터 (기본)", url: "/characters/Skins/skaterMaleA.png", rim: null, unlockGrade: null },
  { id: "skaterFemaleA", label: "러너", url: "/characters/Skins/skaterFemaleA.png", rim: "#06D6A0", unlockGrade: "COMMON" },
  { id: "criminalMaleA", label: "무법자", url: "/characters/Skins/criminalMaleA.png", rim: "#8B5CF6", unlockGrade: "RARE" },
  { id: "cyborgFemaleA", label: "사이보그", url: "/characters/Skins/cyborgFemaleA.png", rim: "#FFD700", unlockGrade: "EPIC" },
];

const GRADE_RANK: Record<Grade, number> = {
  COMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
};

export function skinById(id: SkinId): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

/** 보유 칭호 등급 목록으로 해금된 스킨들을 반환한다. */
export function unlockedSkins(ownedGrades: string[]): SkinDef[] {
  const maxRank = ownedGrades.reduce((m, g) => Math.max(m, GRADE_RANK[g as Grade] ?? 0), 0);
  return SKINS.filter((s) => s.unlockGrade === null || GRADE_RANK[s.unlockGrade] <= maxRank);
}

/** 레벨 → 기본 스킨 (칭호 선택이 없을 때의 폴백). */
export function skinFromLevel(level: number): SkinDef {
  if (level >= 20) return skinById("cyborgFemaleA");
  if (level >= 10) return skinById("criminalMaleA");
  if (level >= 5) return skinById("skaterFemaleA");
  return skinById("skaterMaleA");
}

const STORAGE_KEY = "exp-calendar.character-skin";

export function getStoredSkin(): SkinId | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v && SKINS.some((s) => s.id === v) ? (v as SkinId) : null;
}

export function setStoredSkin(id: SkinId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}
