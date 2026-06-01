import { GRADE_TILE } from "@/lib/summon";
import { GRADE_BORDER, type GradeKey } from "@/lib/game";
import type { Grade } from "@/lib/types";

// 등급 색 픽셀 타일 — 슈퍼레트로월드 에셋 부재 대비 placeholder.
// 깨진 이미지 대신 디자인 토큰 배경의 둥근 타일 + 픽셀 도트 패턴.
export default function PixelTile({
  grade,
  size = 96,
  locked = false,
  label,
  className = "",
}: {
  grade: Grade;
  size?: number;
  locked?: boolean;
  /** 잠금/미공개 시 중앙 표시 텍스트(예: "?"). */
  label?: string;
  className?: string;
}) {
  const g = (grade in GRADE_BORDER ? grade : "COMMON") as GradeKey;
  const tile = locked ? "bg-surface-2" : GRADE_TILE[grade];

  return (
    <div
      className={`relative grid place-items-center rounded-lg border ${GRADE_BORDER[g]} ${tile} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* 픽셀 도트 격자 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.25) 1px, transparent 1px)",
          backgroundSize: `${Math.max(6, Math.round(size / 12))}px ${Math.max(
            6,
            Math.round(size / 12)
          )}px`,
        }}
      />
      {label ? (
        <span className="relative text-2xl font-bold text-text-2 select-none">{label}</span>
      ) : null}
    </div>
  );
}
