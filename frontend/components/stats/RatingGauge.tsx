"use client";

// 등급 산출 게이지 (uxui_10): 큰 등급 글자 + "상위 N% · 다음 등급까지 N%" +
// 세그먼트 막대 + D C B A S 눈금(현재 등급 골드 강조).
// 색은 토큰만 사용 (gold/border/text-2).

import { RATING_ORDER, type RatingInfo } from "./rating";

interface Props {
  info: RatingInfo;
}

const SEGMENTS = 24;

export default function RatingGauge({ info }: Props) {
  // 전체 게이지에서의 채움 비율: 현재 밴드 인덱스 + 밴드 내 진척.
  const idx = RATING_ORDER.indexOf(info.letter);
  const overall = (idx + info.progress) / RATING_ORDER.length; // 0~1
  const filled = Math.round(overall * SEGMENTS);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="font-mono text-5xl font-bold text-gold leading-none">{info.letter}</div>
      <div className="text-xs text-text-2">
        상위 {info.topPercent}%
        {info.next
          ? ` · 다음 등급 ${info.next}까지 ${info.remainingPct}% 남음`
          : " · 최고 등급 도달"}
      </div>

      {/* 세그먼트 막대 */}
      <div className="flex w-full gap-[3px]">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 rounded-[2px] ${
              i < filled ? "bg-gold" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      {/* 눈금 라벨 */}
      <div className="flex w-full items-center justify-between">
        {RATING_ORDER.map((g) => {
          const active = g === info.letter;
          return (
            <span
              key={g}
              className={`inline-flex h-7 w-7 items-center justify-center rounded border font-mono text-sm ${
                active
                  ? "border-gold text-gold"
                  : "border-border text-text-2"
              }`}
            >
              {g}
            </span>
          );
        })}
      </div>
    </div>
  );
}
