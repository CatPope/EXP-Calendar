// 2D character catalog — backed by the auto-generated Pipoya sprite manifest.
// All 400+ source characters are selectable; see scripts/gen-characters.mjs.
// Each sprite sheet is a 3-col (walk) x 4-row (direction) grid of equal frames;
// the avatar shows the front-idle frame (col 1, row 0) and can walk on hover.

import {
  CHARACTERS,
  SHEET_COLS,
  SHEET_ROWS,
  IDLE_COL,
  IDLE_ROW,
  type CharacterDef,
} from "./characters.generated";

export type SkinId = string;
export type { CharacterDef };
export { CHARACTERS, SHEET_COLS, SHEET_ROWS, IDLE_COL, IDLE_ROW };

/** Fallback skin for users who haven't picked one. */
export const DEFAULT_SKIN: SkinId = CHARACTERS[0]?.id ?? "m-01-1";

const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

export function skinById(id: string | null | undefined): CharacterDef {
  return (id ? BY_ID.get(id) : undefined) ?? BY_ID.get(DEFAULT_SKIN) ?? CHARACTERS[0];
}

export function isValidSkin(id: string | null | undefined): boolean {
  return !!id && BY_ID.has(id);
}

// Every character is unlocked; level only decides the default for new users.
export function skinFromLevel(_level: number): CharacterDef {
  return skinById(DEFAULT_SKIN);
}

export interface CharacterGroup {
  category: string;
  items: CharacterDef[];
}

/** Catalog grouped by category, preserving manifest order. */
export function groupedCharacters(): CharacterGroup[] {
  const groups: CharacterGroup[] = [];
  const idx = new Map<string, CharacterGroup>();
  for (const c of CHARACTERS) {
    let g = idx.get(c.category);
    if (!g) {
      g = { category: c.category, items: [] };
      idx.set(c.category, g);
      groups.push(g);
    }
    g.items.push(c);
  }
  return groups;
}

const STORAGE_KEY = "exp-calendar.character-skin";

export function getStoredSkin(): SkinId | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v && BY_ID.has(v) ? v : null;
}

export function setStoredSkin(id: SkinId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}
