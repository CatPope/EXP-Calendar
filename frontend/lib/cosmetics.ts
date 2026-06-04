// Cosmetic catalog — SSoT for cosmetic effect ids and their visual definitions.
// Effect ids match the shop item `effect` field from the backend.

import type { CSSProperties } from "react";

export type CosmeticKind = "overlay" | "aura" | "bg";

export interface CosmeticDef {
  /** i18n key (identity.cos_*) for the user-facing label */
  labelKey: string;
  kind: CosmeticKind;
  /** emoji rendered as an overlay above the avatar (kind === "overlay") */
  emoji?: string;
  /** inline style applied to the wrapper div */
  wrapperStyle?: CSSProperties;
  /** CSS class(es) appended to the wrapper div */
  wrapperClassName?: string;
  /** gradient / colour used as an absolutely-positioned bg layer (kind === "bg") */
  bgStyle?: CSSProperties;
}

const CATALOG: Record<string, CosmeticDef> = {
  "cosmetic:hat": {
    labelKey: "identity.cos_hat",
    kind: "overlay",
    emoji: "🎩",
  },
  "cosmetic:crown": {
    labelKey: "identity.cos_crown",
    kind: "overlay",
    emoji: "👑",
  },
  "cosmetic:aura": {
    labelKey: "identity.cos_aura",
    kind: "aura",
    wrapperStyle: {
      boxShadow: "0 0 18px 4px rgba(139,92,246,0.7)",
      borderRadius: "50%",
    },
  },
  "cosmetic:bg_space": {
    labelKey: "identity.cos_bg_space",
    kind: "bg",
    bgStyle: {
      background:
        "radial-gradient(ellipse at center, #1a1040 0%, #050010 70%, #000000 100%)",
    },
  },
  "cosmetic:bg_forest": {
    labelKey: "identity.cos_bg_forest",
    kind: "bg",
    bgStyle: {
      background:
        "radial-gradient(ellipse at center, #1a3a1a 0%, #0a1f0a 70%, #000000 100%)",
    },
  },
};

/** Returns the cosmetic definition for the given effect id, or null if unknown. */
export function cosmeticById(effect: string | null | undefined): CosmeticDef | null {
  if (!effect) return null;
  return CATALOG[effect] ?? null;
}

/** All known effect ids, in display order. */
export const ALL_COSMETIC_IDS = Object.keys(CATALOG);

export default CATALOG;
