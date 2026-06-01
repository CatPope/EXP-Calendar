import { gradeBadgeClass, gradeLabel } from "@/lib/game";
import { Star } from "lucide-react";

// 등급 배지 (★ LEGEND 등) — uxui_06·07 공통. 등급 색은 lib/game 단일 소스만 사용.
export default function GradeBadge({
  grade,
  className = "",
}: {
  grade: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${gradeBadgeClass(
        grade
      )} ${className}`}
    >
      <Star className="h-3 w-3 fill-current" />
      {gradeLabel(grade)}
    </span>
  );
}
