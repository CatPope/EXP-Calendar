"use client";

import { useEffect, useRef, useState } from "react";
import {
  skinById,
  skinFromLevel,
  SHEET_COLS,
  SHEET_ROWS,
  IDLE_COL,
  IDLE_ROW,
  type SkinId,
} from "@/lib/character";

interface Props {
  level: number;
  size?: number;
  className?: string;
  withFrame?: boolean;
  /** 명시 스킨 id. 없으면 level 기반 기본 스킨. */
  skin?: SkinId;
  /** hover 시 걷기 애니메이션. 리스트 썸네일은 false로 정적. */
  animated?: boolean;
}

// 정면(아래) 방향 걷기 프레임 순환: 가운데(정지) → 좌 → 가운데 → 우.
const WALK_CYCLE = [IDLE_COL, 0, IDLE_COL, 2];

export default function CharacterAvatar({
  level,
  size = 64,
  className = "",
  withFrame = false,
  skin,
  animated = true,
}: Props) {
  const def = skin ? skinById(skin) : skinFromLevel(level);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  function startWalk() {
    if (!animated || timer.current) return;
    timer.current = setInterval(
      () => setStep((s) => (s + 1) % WALK_CYCLE.length),
      180
    );
  }
  function stopWalk() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setStep(0);
  }

  const col = animated ? WALK_CYCLE[step] : IDLE_COL;
  const row = IDLE_ROW;

  const sprite = (
    <div
      onMouseEnter={startWalk}
      onMouseLeave={stopWalk}
      style={{
        width: size,
        height: size,
        backgroundImage: `url("${encodeURI(def.src)}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${SHEET_COLS * size}px ${SHEET_ROWS * size}px`,
        backgroundPosition: `${-col * size}px ${-row * size}px`,
        imageRendering: "pixelated",
      }}
      role="img"
      aria-label={`Lv.${level} ${def.label} 캐릭터`}
      className="select-none"
      draggable={false}
    />
  );

  if (!withFrame) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        {sprite}
      </div>
    );
  }
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-surface-2 border border-accent/40 p-2 ${className}`}
      style={{
        width: size + 16,
        height: size + 16,
        boxShadow: "0 0 16px -2px rgba(139,92,246,0.33)",
      }}
    >
      {sprite}
    </div>
  );
}
