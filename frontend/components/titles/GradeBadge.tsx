import { gradeBadgeClass, gradeLabel } from "@/lib/game";

// ★ COMMON/RARE/EPIC/LEGEND 등급 배지 — 색/라벨은 lib/game 단일 소스.
export default function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium tracking-wide ${gradeBadgeClass(
        grade
      )}`}
    >
      <span aria-hidden>★</span>
      {gradeLabel(grade)}
    </span>
  );
}
