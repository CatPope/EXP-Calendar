"use client";

// 통계 4종 지표 카드 (uxui_09): 주간/월간 성공률, 최장 스트릭, 등급.
// 큰 값은 토큰 색으로 강조한다. 하드코딩 색 금지.

interface Props {
  label: string;
  value: string;
  /** 값 색상 토큰 클래스 (예: text-success / text-accent / text-gold). */
  valueClass?: string;
}

export default function StatCard({ label, value, valueClass = "text-text-1" }: Props) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 py-5 text-center">
      <div className="text-xs text-text-2">{label}</div>
      <div className={`text-3xl font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}
