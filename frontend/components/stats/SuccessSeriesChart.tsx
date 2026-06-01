"use client";

// 성공/실패 시계열 — 외부 차트 라이브러리 없이 인라인 SVG 라인 차트 (uxui_10).
// 최근 N개 포인트의 success 값을 꺾은선 + 노드로 그린다.
// 색은 디자인 토큰(currentColor 기반)으로만 — stroke는 accent, 노드는 success.

import type { StatsSeriesPoint } from "@/lib/types";

interface Props {
  points: StatsSeriesPoint[];
  /** 그릴 최근 포인트 수 (기본 12). */
  limit?: number;
}

const VB_W = 600;
const VB_H = 160;
const PAD_X = 12;
const PAD_Y = 18;

export default function SuccessSeriesChart({ points, limit = 12 }: Props) {
  const data = points.slice(-limit);

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-2">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  const maxV = Math.max(1, ...data.map((p) => p.success || 0));
  const innerW = VB_W - PAD_X * 2;
  const innerH = VB_H - PAD_Y * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const coords = data.map((p, i) => {
    const x = PAD_X + (data.length > 1 ? stepX * i : innerW / 2);
    const y = PAD_Y + innerH - ((p.success || 0) / maxV) * innerH;
    return { x, y, p };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-40 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="최근 추세 성공 일수 라인 차트"
    >
      {/* baseline */}
      <line
        x1={PAD_X}
        y1={PAD_Y + innerH}
        x2={VB_W - PAD_X}
        y2={PAD_Y + innerH}
        className="stroke-border"
        strokeWidth={1}
      />
      {/* line (accent) */}
      <path
        d={linePath}
        fill="none"
        className="stroke-accent"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* nodes (success/cyan) */}
      {coords.map((c, i) => (
        <rect
          key={i}
          x={c.x - 3}
          y={c.y - 3}
          width={6}
          height={6}
          className="fill-success"
        >
          <title>{`${c.p.date}: 성공 ${c.p.success}일`}</title>
        </rect>
      ))}
    </svg>
  );
}
