"use client";

import CharacterAvatar from "@/components/CharacterAvatar";
import { cosmeticById } from "@/lib/cosmetics";
import type { SkinId } from "@/lib/character";

interface Props {
  /** Character level (used to pick default skin and avatar label). */
  level: number;
  /** Explicit skin override — passed through to CharacterAvatar. */
  skin?: SkinId;
  /** Rendered size in px (square). */
  size?: number;
  /** Cosmetic effect id, e.g. "cosmetic:hat". Empty/null = no cosmetic. */
  cosmetic?: string | null;
  /** Whether to render the purple frame behind the avatar. */
  withFrame?: boolean;
  /** Passed through to the outer wrapper div. */
  className?: string;
  /** Animate on hover. */
  animated?: boolean;
}

/**
 * Drop-in replacement for CharacterAvatar that also renders the active cosmetic.
 *
 * Layout (relative wrapper):
 *   [bg layer — absolutely behind avatar]
 *   [CharacterAvatar]
 *   [overlay emoji — absolutely above avatar, top-center]
 */
export default function CosmeticAvatar({
  level,
  skin,
  size = 64,
  cosmetic,
  withFrame = false,
  className = "",
  animated = true,
}: Props) {
  const def = cosmeticById(cosmetic);

  // Effective size for the frame padding that withFrame adds.
  const outerSize = withFrame ? size + 16 : size;

  // Aura: apply glow to the wrapper but still show the plain avatar.
  const auraStyle = def?.kind === "aura" ? def.wrapperStyle : undefined;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: outerSize, height: outerSize, ...auraStyle }}
    >
      {/* Background cosmetic layer — rendered behind everything */}
      {def?.kind === "bg" && def.bgStyle && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={def.bgStyle}
        />
      )}

      {/* The actual character avatar */}
      <CharacterAvatar
        level={level}
        skin={skin}
        size={size}
        withFrame={withFrame}
        animated={animated}
      />

      {/* Overlay emoji — top-center above the avatar */}
      {def?.kind === "overlay" && def.emoji && (
        <span
          aria-hidden
          className="absolute pointer-events-none select-none"
          style={{
            // Position at top-center of the inner avatar (not the full outerSize).
            top: withFrame ? 4 : 0,
            left: "50%",
            transform: "translateX(-50%) translateY(-40%)",
            fontSize: Math.max(12, Math.round(size * 0.35)),
            lineHeight: 1,
            zIndex: 10,
          }}
        >
          {def.emoji}
        </span>
      )}
    </div>
  );
}
