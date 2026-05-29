"use client";

import Image from "next/image";
import { useState } from "react";
import { poseUrl, skinById, skinFromLevel, type SkinId } from "@/lib/character";

interface Props {
  level: number;
  size?: number;
  className?: string;
  withFrame?: boolean;
  /** 명시 스킨. 없으면 level 기반 기본 스킨. */
  skin?: SkinId;
  /** hover 시 jump 포즈로 전환. 리스트 썸네일은 false로 정적. */
  animated?: boolean;
}

export default function CharacterAvatar({
  level,
  size = 64,
  className = "",
  withFrame = false,
  skin,
  animated = true,
}: Props) {
  const def = skin ? skinById(skin) : skinFromLevel(level);
  const [hover, setHover] = useState(false);
  const src = poseUrl(def, animated && hover ? "jump" : "idle");

  const inner = (
    <div
      className="flex h-full w-full items-end justify-center"
      onMouseEnter={() => animated && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Image
        src={src}
        alt={`Lv.${level} ${def.label} 캐릭터`}
        width={96}
        height={128}
        unoptimized
        draggable={false}
        className="h-full w-auto object-contain transition-transform duration-150 select-none"
        style={{ transform: hover ? "translateY(-6%)" : "none" }}
      />
    </div>
  );

  if (!withFrame) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        {inner}
      </div>
    );
  }
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-surface-2 border p-2 ${className}`}
      style={{
        width: size + 16,
        height: size + 16,
        borderColor: def.rim ?? undefined,
        boxShadow: def.rim ? `0 0 16px -2px ${def.rim}55` : undefined,
      }}
    >
      <div style={{ width: size, height: size }}>{inner}</div>
    </div>
  );
}
