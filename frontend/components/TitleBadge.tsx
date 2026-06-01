import type { Title } from "@/lib/types";
import { Crown } from "lucide-react";
import { GRADE_TEXT, type GradeKey } from "@/lib/game";

// 칭호 이름 인라인 배지 — 등급 색은 lib/game 단일 소스만 사용(하드코딩 금지).
export default function TitleBadge({
  title,
  modifier
}: {
  title: Title | null;
  modifier?: string | null;
}) {
  if (!title) {
    return <span className="text-text-2 text-xs">칭호 없음</span>;
  }
  const g = (title.grade as GradeKey) in GRADE_TEXT ? (title.grade as GradeKey) : "COMMON";
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${GRADE_TEXT[g]}`}>
      <Crown className="h-3 w-3" />
      {modifier ? <span className="text-danger">[{modifier}]</span> : null}
      <span>{title.name}</span>
    </span>
  );
}
