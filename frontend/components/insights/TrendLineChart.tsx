"use client";

// 통계 기간별 추이를 한 차트에 success/fail 두 선으로 표시한다.
// 외부 차트 라이브러리를 쓰지 않고 SVG 로 직접 렌더한다 (calendar 와 동일 정책).
//
// 사용처: 내 정체성 페이지(통계 흡수), 다른 사용자 쇼케이스(통계 공개 시).
export interface TrendPoint {
  key: string;
  label: string;
  success: number;
  fail: number;
}

export default function TrendLineChart({
  points,
  showAllLabels,
}: {
  points: TrendPoint[];
  showAllLabels: boolean;
}) {
  const W = 600;
  const H = 200;
  const PAD = { l: 32, r: 12, t: 12, b: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const rawMax = points.reduce(
    (m, p) => Math.max(m, p.success, p.fail),
    0
  );
  const max = Math.max(1, rawMax);
  const n = points.length;
  const xAt = (i: number) =>
    PAD.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const buildPath = (key: "success" | "fail") =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(p[key]).toFixed(2)}`
      )
      .join(" ");
  const ticks = [0, Math.round(max / 2), max];
  const labelStep = showAllLabels ? 1 : Math.max(1, Math.ceil(n / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" role="img">
      {ticks.map((v, idx) => (
        <g key={`tick-${idx}-${v}`}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yAt(v)}
            y2={yAt(v)}
            stroke="rgb(var(--border-default))"
            strokeDasharray="2 3"
            strokeWidth={1}
          />
          <text
            x={PAD.l - 4}
            y={yAt(v) + 3}
            fontSize={9}
            textAnchor="end"
            fill="rgb(var(--text-2))"
            className="tabular-nums"
          >
            {v}
          </text>
        </g>
      ))}
      <path
        d={buildPath("success")}
        fill="none"
        stroke="rgb(var(--success))"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={buildPath("fail")}
        fill="none"
        stroke="rgb(var(--danger))"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <g key={`dot-${p.key}`}>
          <circle cx={xAt(i)} cy={yAt(p.success)} r={2.5} fill="rgb(var(--success))" />
          <circle cx={xAt(i)} cy={yAt(p.fail)} r={2.5} fill="rgb(var(--danger))" />
        </g>
      ))}
      {points.map((p, i) => {
        if (i % labelStep !== 0 && i !== n - 1) return null;
        return (
          <text
            key={`lbl-${p.key}`}
            x={xAt(i)}
            y={H - 8}
            fontSize={10}
            textAnchor="middle"
            fill="rgb(var(--text-2))"
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
