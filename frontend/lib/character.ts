// 2D character catalog (Kenney Toon Characters) + 칭호 등급 기반 해금.
// 각 캐릭터는 public/characters/<folder>/PNG/Poses HD/character_<prefix>_<pose>.png 형태.

export type SkinId =
  | "malePerson"
  | "femalePerson"
  | "maleAdventurer"
  | "femaleAdventurer"
  | "robot"
  | "zombie";

export type Grade = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type Pose = "idle" | "jump" | "cheer0" | "walk0" | "run0";

export interface SkinDef {
  id: SkinId;
  label: string;
  folder: string;
  prefix: string;
  rim: string | null;
  /** 이 등급 이상의 칭호를 보유하면 해금. null이면 기본(항상 사용 가능). */
  unlockGrade: Grade | null;
}

export const SKINS: SkinDef[] = [
  { id: "malePerson", label: "시민 (남)", folder: "Male person", prefix: "malePerson", rim: null, unlockGrade: null },
  { id: "femalePerson", label: "시민 (여)", folder: "Female person", prefix: "femalePerson", rim: null, unlockGrade: null },
  { id: "maleAdventurer", label: "모험가 (남)", folder: "Male adventurer", prefix: "maleAdventurer", rim: "#06D6A0", unlockGrade: "COMMON" },
  { id: "femaleAdventurer", label: "모험가 (여)", folder: "Female adventurer", prefix: "femaleAdventurer", rim: "#06D6A0", unlockGrade: "COMMON" },
  { id: "robot", label: "로봇", folder: "Robot", prefix: "robot", rim: "#8B5CF6", unlockGrade: "RARE" },
  { id: "zombie", label: "좀비", folder: "Zombie", prefix: "zombie", rim: "#FFD700", unlockGrade: "EPIC" },
];

const GRADE_RANK: Record<Grade, number> = {
  COMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
};

/** 포즈 PNG의 정적 경로 (공백 포함이라 URL 인코딩). */
export function poseUrl(def: SkinDef, pose: Pose): string {
  return encodeURI(`/characters/${def.folder}/PNG/Poses HD/character_${def.prefix}_${pose}.png`);
}

export function skinById(id: SkinId): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

/** 보유 칭호 등급 목록으로 해금된 스킨들을 반환한다. */
export function unlockedSkins(ownedGrades: string[]): SkinDef[] {
  const maxRank = ownedGrades.reduce((m, g) => Math.max(m, GRADE_RANK[g as Grade] ?? 0), 0);
  return SKINS.filter((s) => s.unlockGrade === null || GRADE_RANK[s.unlockGrade] <= maxRank);
}

/** 레벨 → 기본 스킨 (칭호 선택이 없을 때의 폴백, 해금 등급과 일치). */
export function skinFromLevel(level: number): SkinDef {
  if (level >= 20) return skinById("zombie");
  if (level >= 10) return skinById("robot");
  if (level >= 5) return skinById("maleAdventurer");
  return skinById("malePerson");
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
